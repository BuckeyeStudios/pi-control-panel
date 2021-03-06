import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RaspberryPiService } from '@services/raspberry-pi.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import {
  IRaspberryPi,
  ICpuFrequency,
  ICpuSensorsStatus,
  ICpuLoadStatus,
  IMemoryStatus,
  IRandomAccessMemoryStatus,
  INetworkInterfaceStatus
} from '@interfaces/raspberry-pi';
import { AuthService } from '@services/auth.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  get,
  remove,
  orderBy,
  map,
  isNil,
  first,
  startsWith,
  endsWith,
  trimEnd,
  max,
  min,
  take as _take,
  difference,
  forEach,
  invoke,
  includes,
  fill,
  isEmpty,
  find,
  toNumber
} from 'lodash';
import { RealTimeChartModalComponent } from './chart/real-time-chart-modal.component';
import { CpuFrequencyService } from '@services/cpu-frequency.service';
import { CpuSensorsStatusService } from '@services/cpu-sensors-status.service';
import { CpuLoadStatusService } from '@services/cpu-load-status.service';
import { RamStatusService } from '@services/ram-status.service';
import { SwapMemoryStatusService } from '@services/swap-memory-status.service';
import { FileSystemStatusService } from '@services/disk-file-system-status.service';
import { OsStatusService } from '@services/os-status.service';
import { NetworkInterfaceStatusService } from '@services/network-interface-status.service';
import { CpuMaxFrequencyLevel } from '@constants/cpu-max-frequency-level';
import { ChartData } from '@constants/chart-data';
import { MAX_CHART_VISIBLE_ITEMS } from '@constants/consts';
import { environment } from '@environments/environment';
import { BytesPipe } from 'angular-pipes';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  raspberryPi: IRaspberryPi;
  alert: { message: string, type: string, logout: boolean };
  chartModalRef: BsModalRef;

  subscribedToNewCpuFrequencies: boolean;
  subscribedToNewCpuSensorsStatuses: boolean;
  subscribedToNewCpuLoadStatuses: boolean;
  subscribedToNewRamStatuses: boolean;
  subscribedToNewSwapMemoryStatuses: boolean;
  subscribedToNewOsStatuses: boolean;
  subscribedToNewDiskFileSystemStatuses: boolean[];
  subscribedToNewNetworkInterfaceStatuses: boolean[];

  cpuFrequencyBehaviorSubjectSubscription: Subscription;
  cpuSensorsStatusBehaviorSubjectSubscription: Subscription;
  cpuLoadStatusBehaviorSubjectSubscription: Subscription;
  ramStatusBehaviorSubjectSubscription: Subscription;
  swapMemoryStatusBehaviorSubjectSubscription: Subscription;
  osStatusBehaviorSubjectSubscription: Subscription;
  diskFileSystemStatusBehaviorSubjectSubscriptions: Subscription[];
  networkInterfaceStatusBehaviorSubjectSubscriptions: Subscription[];

  cpuFrequencyPeriodicRefetchSubscription: Subscription;
  cpuSensorsStatusPeriodicRefetchSubscription: Subscription;
  cpuLoadStatusPeriodicRefetchSubscription: Subscription;
  ramStatusPeriodicRefetchSubscription: Subscription;
  swapMemoryStatusPeriodicRefetchSubscription: Subscription;
  osStatusPeriodicRefetchSubscription: Subscription;
  diskFileSystemStatusPeriodicRefetchSubscription: Subscription;
  networkInterfaceStatusPeriodicRefetchSubscription: Subscription;

  isSuperUser: boolean;
  refreshTokenPeriodicallySubscription: Subscription;
  CpuMaxFrequencyLevel = CpuMaxFrequencyLevel;

  readonly MAX_CHART_VISIBLE_ITEMS = MAX_CHART_VISIBLE_ITEMS;
  selectedChartItems: string[];
  unselectedChartItems: string[];

  loadAverageGaugeChartData: any = {
    results: [],
    colors: [],
    maxScaleValue: 0
  };

  networkInterfaceSpeedGaugeChartData: any[];

  version = environment.version;

  constructor(private _route: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService,
    private raspberryPiService: RaspberryPiService,
    private authService: AuthService,
    private cpuFrequencyService: CpuFrequencyService,
    private cpuSensorsStatusService: CpuSensorsStatusService,
    private cpuLoadStatusService: CpuLoadStatusService,
    private ramStatusService: RamStatusService,
    private swapMemoryStatusService: SwapMemoryStatusService,
    private osStatusService: OsStatusService,
    private diskFileSystemStatusService: FileSystemStatusService,
    private networkInterfaceStatusService: NetworkInterfaceStatusService) { }

  ngOnInit() {
    this.alert = null;
    this.raspberryPi = this._route.snapshot.data['raspberryPi'];
    this.isSuperUser = this.authService.isSuperUser();

    const chartDataNames = map(ChartData, 'name');
    this.selectedChartItems = _take(chartDataNames, MAX_CHART_VISIBLE_ITEMS);
    this.unselectedChartItems = difference(chartDataNames, this.selectedChartItems);

    this.refreshTokenPeriodicallySubscription = this.authService.refreshTokenPeriodically()
      .subscribe(
        result => {
          console.log(result ? `Token refreshed @ ${new Date()}` : "Failed to refresh token");
        },
        error => this.alert = { message: error, type: 'danger', logout: false }
      );

    if (!isNil(get(this.raspberryPi, 'cpu.frequency'))) {
      this.subscribedToNewCpuFrequencies = false;
      this.cpuFrequencyBehaviorSubjectSubscription = this.cpuFrequencyService.getLastCpuFrequencies()
        .subscribe(
          result => {
            this.raspberryPi.cpu.frequency = first(orderBy(result.items, 'dateTime', 'desc'));
            this.raspberryPi.cpu.frequencies = result.items;
            if (!isNil(this.chartModalRef) && includes(this.selectedChartItems, ChartData[0].name)) {
              this.chartModalRef.content.chartData[0].series = this.getOrderedAndMappedCpuNormalizedFrequencies();
              this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
            }
            if (!this.subscribedToNewCpuFrequencies) {
              this.cpuFrequencyService.subscribeToNewCpuFrequencies();
              this.cpuFrequencyPeriodicRefetchSubscription = this.cpuFrequencyService.refetchPeriodically()
                .subscribe(
                  result => {
                    console.log(result ? `CPU frequency refetched @ ${new Date()}` : "Failed to refetch CPU frequency");
                  },
                  error => this.alert = { message: error, type: 'danger', logout: false }
                );
              this.subscribedToNewCpuFrequencies = true;
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }

    if (!isNil(get(this.raspberryPi, 'cpu.sensorsStatus'))) {
      this.subscribedToNewCpuSensorsStatuses = false;
      this.cpuSensorsStatusBehaviorSubjectSubscription = this.cpuSensorsStatusService.getLastCpuSensorsStatuses()
        .subscribe(
          result => {
            this.raspberryPi.cpu.sensorsStatus = first(orderBy(result.items, 'dateTime', 'desc'));
            this.raspberryPi.cpu.sensorsStatuses = result.items;
            if (!isNil(this.chartModalRef) && includes(this.selectedChartItems, ChartData[1].name)) {
              this.chartModalRef.content.chartData[1].series = this.getOrderedAndMappedCpuTemperatures();
              this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
            }
            if (!this.subscribedToNewCpuSensorsStatuses) {
              this.cpuSensorsStatusService.subscribeToNewCpuSensorsStatuses();
              this.cpuSensorsStatusPeriodicRefetchSubscription = this.cpuSensorsStatusService.refetchPeriodically()
                .subscribe(
                  result => {
                    console.log(result ? `CPU sensors status refetched @ ${new Date()}` : "Failed to refetch CPU sensors status");
                  },
                  error => this.alert = { message: error, type: 'danger', logout: false }
                );
              this.subscribedToNewCpuSensorsStatuses = true;
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }

    if (!isNil(get(this.raspberryPi, 'cpu.loadStatus'))) {
      this.subscribedToNewCpuLoadStatuses = false;
      this.cpuLoadStatusBehaviorSubjectSubscription = this.cpuLoadStatusService.getLastCpuLoadStatuses()
        .subscribe(
          result => {
            this.raspberryPi.cpu.loadStatus = first(orderBy(result.items, 'dateTime', 'desc'));
            this.loadAverageGaugeChartData = this.getLoadAverageGaugeChartData();
            this.raspberryPi.cpu.loadStatuses = result.items;
            if (!isNil(this.chartModalRef) && includes(this.selectedChartItems, ChartData[2].name)) {
              this.chartModalRef.content.chartData[2].series = this.getOrderedAndMappedCpuLoadStatuses();
              this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
            }
            if (!this.subscribedToNewCpuLoadStatuses) {
              this.cpuLoadStatusService.subscribeToNewCpuLoadStatuses();
              this.cpuLoadStatusPeriodicRefetchSubscription = this.cpuLoadStatusService.refetchPeriodically()
                .subscribe(
                  result => {
                    console.log(result ? `CPU load status refetched @ ${new Date()}` : "Failed to refetch CPU load status");
                  },
                  error => this.alert = { message: error, type: 'danger', logout: false }
                );
              this.subscribedToNewCpuLoadStatuses = true;
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }

    if (!isNil(get(this.raspberryPi, 'ram.status'))) {
      this.subscribedToNewRamStatuses = false;
      this.ramStatusBehaviorSubjectSubscription = this.ramStatusService.getLastMemoryStatuses()
        .subscribe(
          result => {
            this.raspberryPi.ram.status = first(orderBy(result.items, 'dateTime', 'desc'));
            this.raspberryPi.ram.statuses = result.items;
            if (!isNil(this.chartModalRef) && includes(this.selectedChartItems, ChartData[3].name)) {
              this.chartModalRef.content.chartData[3].series = this.getOrderedAndMappedRamStatuses();
              this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
            }
            if (!this.subscribedToNewRamStatuses) {
              this.ramStatusService.subscribeToNewMemoryStatuses();
              this.ramStatusPeriodicRefetchSubscription = this.ramStatusService.refetchPeriodically()
                .subscribe(
                  result => {
                    console.log(result ? `RAM status refetched @ ${new Date()}` : "Failed to refetch RAM status");
                  },
                  error => this.alert = { message: error, type: 'danger', logout: false }
                );
              this.subscribedToNewRamStatuses = true;
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }

    if (!isNil(get(this.raspberryPi, 'swapMemory.status'))) {
      this.subscribedToNewSwapMemoryStatuses = false;
      this.swapMemoryStatusBehaviorSubjectSubscription = this.swapMemoryStatusService.getLastMemoryStatuses()
        .subscribe(
          result => {
            this.raspberryPi.swapMemory.status = first(orderBy(result.items, 'dateTime', 'desc'));
            this.raspberryPi.swapMemory.statuses = result.items;
            if (!isNil(this.chartModalRef) && includes(this.selectedChartItems, ChartData[4].name)) {
              this.chartModalRef.content.chartData[4].series = this.getOrderedAndMappedSwapMemoryStatuses();
              this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
            }
            if (!this.subscribedToNewSwapMemoryStatuses) {
              this.swapMemoryStatusService.subscribeToNewMemoryStatuses();
              this.swapMemoryStatusPeriodicRefetchSubscription = this.swapMemoryStatusService.refetchPeriodically()
                .subscribe(
                  result => {
                    console.log(result ? `Swap memory status refetched @ ${new Date()}` : "Failed to refetch swap memory status");
                  },
                  error => this.alert = { message: error, type: 'danger', logout: false }
                );
              this.subscribedToNewSwapMemoryStatuses = true;
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }

    if (!isNil(get(this.raspberryPi, 'os.status'))) {
      this.subscribedToNewOsStatuses = false;
      this.osStatusBehaviorSubjectSubscription = this.osStatusService.getLastOsStatuses()
        .subscribe(
          result => {
            this.raspberryPi.os.status = first(orderBy(result.items, 'dateTime', 'desc'));
            this.raspberryPi.os.statuses = result.items;
            if (!this.subscribedToNewOsStatuses) {
              this.osStatusService.subscribeToNewOsStatuses();
              this.osStatusPeriodicRefetchSubscription = this.osStatusService.refetchPeriodically()
                .subscribe(
                  result => {
                    console.log(result ? `OS status refetched @ ${new Date()}` : "Failed to refetch OS status");
                  },
                  error => this.alert = { message: error, type: 'danger', logout: false }
                );
              this.subscribedToNewOsStatuses = true;
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }

    if (!isNil(get(this.raspberryPi, 'disk.fileSystems'))) {
      const numberOfFileSystems = this.raspberryPi.disk.fileSystems.length;
      this.subscribedToNewDiskFileSystemStatuses = fill(Array(numberOfFileSystems), false);
      this.diskFileSystemStatusBehaviorSubjectSubscriptions = fill(Array(numberOfFileSystems), null);
      for (const fileSystem of this.raspberryPi.disk.fileSystems) {
        const fileSystemName = fileSystem.name;
        this.diskFileSystemStatusBehaviorSubjectSubscriptions[fileSystemName] =
          this.diskFileSystemStatusService.getLastFileSystemStatuses(fileSystemName)
            .subscribe(
              result => {
                fileSystem.status = first(orderBy(result.items, 'dateTime', 'desc'));
                fileSystem.statuses = result.items;
                if (!this.subscribedToNewDiskFileSystemStatuses[fileSystemName]) {
                  this.diskFileSystemStatusService.subscribeToNewFileSystemStatuses(fileSystemName);
                  if (isNil(this.diskFileSystemStatusPeriodicRefetchSubscription)) {
                    this.diskFileSystemStatusPeriodicRefetchSubscription = this.diskFileSystemStatusService.refetchPeriodically()
                      .subscribe(
                        result => {
                          console.log(result ? `Disk file system statuses refetched @ ${new Date()}` : "Failed to refetch disk file system statuses");
                        },
                        error => this.alert = { message: error, type: 'danger', logout: false }
                      );
                  }
                  this.subscribedToNewDiskFileSystemStatuses[fileSystemName] = true;
                }
              },
              error => this.alert = { message: error, type: 'danger', logout: false }
            );
      }
    }

    if (!isNil(get(this.raspberryPi, 'network.networkInterfaces'))) {
      const numberOfNetworkInterfaces = this.raspberryPi.network.networkInterfaces.length;
      this.subscribedToNewNetworkInterfaceStatuses = fill(Array(numberOfNetworkInterfaces), false);
      this.networkInterfaceStatusBehaviorSubjectSubscriptions = fill(Array(numberOfNetworkInterfaces), null);
      this.networkInterfaceSpeedGaugeChartData = fill(Array(numberOfNetworkInterfaces), null);
      for (const networkInterface of this.raspberryPi.network.networkInterfaces) {
        const interfaceName = networkInterface.name;

        this.unselectedChartItems.push(`Network ${interfaceName} Rx (B/s)`);
        this.unselectedChartItems.push(`Network ${interfaceName} Tx (B/s)`);

        this.networkInterfaceStatusBehaviorSubjectSubscriptions[interfaceName] =
          this.networkInterfaceStatusService.getLastNetworkInterfaceStatuses(interfaceName)
            .subscribe(
              result => {
                networkInterface.status = first(orderBy(result.items, 'dateTime', 'desc'));
                networkInterface.statuses = result.items;
                const index = this.raspberryPi.network.networkInterfaces.indexOf(networkInterface);
                this.networkInterfaceSpeedGaugeChartData[index] = this.getNetworkInterfaceSpeedGaugeChartData(networkInterface.status);
                if (!isNil(this.chartModalRef)) {
                  if (includes(this.selectedChartItems, `Network ${interfaceName} Rx (B/s)`)) {
                    this.chartModalRef.content.chartData[5 + 2 * index].series = this.getOrderedAndMappedRxNetworkInterfaceNormalizedStatuses(interfaceName);
                    this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
                  }
                  if (includes(this.selectedChartItems, `Network ${interfaceName} Tx (B/s)`)) {
                    this.chartModalRef.content.chartData[5 + 2 * index + 1].series = this.getOrderedAndMappedTxNetworkInterfaceNormalizedStatuses(interfaceName);
                    this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
                  }
                }
                if (!this.subscribedToNewNetworkInterfaceStatuses[interfaceName]) {
                  this.networkInterfaceStatusService.subscribeToNewNetworkInterfaceStatuses(interfaceName);
                  if (isNil(this.networkInterfaceStatusPeriodicRefetchSubscription)) {
                    this.networkInterfaceStatusPeriodicRefetchSubscription = this.networkInterfaceStatusService.refetchPeriodically()
                      .subscribe(
                        result => {
                          console.log(result ? `Network interface statuses refetched @ ${new Date()}` : "Failed to refetch network interface statuses");
                        },
                        error => this.alert = { message: error, type: 'danger', logout: false }
                      );
                  }
                  this.subscribedToNewNetworkInterfaceStatuses[interfaceName] = true;
                }
              },
              error => this.alert = { message: error, type: 'danger', logout: false }
            );
      }
    }
  }

  ngOnDestroy(): void {
    if (!isNil(this.refreshTokenPeriodicallySubscription)) {
      this.refreshTokenPeriodicallySubscription.unsubscribe();
    }
    if (!isNil(this.cpuFrequencyBehaviorSubjectSubscription)) {
      this.cpuFrequencyBehaviorSubjectSubscription.unsubscribe();
    }
    if (!isNil(this.cpuFrequencyPeriodicRefetchSubscription)) {
      this.cpuFrequencyPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isNil(this.cpuSensorsStatusBehaviorSubjectSubscription)) {
      this.cpuSensorsStatusBehaviorSubjectSubscription.unsubscribe();
    }
    if (!isNil(this.cpuSensorsStatusPeriodicRefetchSubscription)) {
      this.cpuSensorsStatusPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isNil(this.cpuLoadStatusBehaviorSubjectSubscription)) {
      this.cpuLoadStatusBehaviorSubjectSubscription.unsubscribe();
    }
    if (!isNil(this.cpuLoadStatusPeriodicRefetchSubscription)) {
      this.cpuLoadStatusPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isNil(this.ramStatusBehaviorSubjectSubscription)) {
      this.ramStatusBehaviorSubjectSubscription.unsubscribe();
    }
    if (!isNil(this.ramStatusPeriodicRefetchSubscription)) {
      this.ramStatusPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isNil(this.swapMemoryStatusBehaviorSubjectSubscription)) {
      this.swapMemoryStatusBehaviorSubjectSubscription.unsubscribe();
    }
    if (!isNil(this.swapMemoryStatusPeriodicRefetchSubscription)) {
      this.swapMemoryStatusPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isNil(this.osStatusBehaviorSubjectSubscription)) {
      this.osStatusBehaviorSubjectSubscription.unsubscribe();
    }
    if (!isNil(this.osStatusPeriodicRefetchSubscription)) {
      this.osStatusPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isEmpty(this.diskFileSystemStatusBehaviorSubjectSubscriptions)) {
      for (const diskFileSystemStatusBehaviorSubjectSubscription of this.diskFileSystemStatusBehaviorSubjectSubscriptions) {
        if (!isNil(diskFileSystemStatusBehaviorSubjectSubscription)) {
          diskFileSystemStatusBehaviorSubjectSubscription.unsubscribe();
        }
      }
    }
    if (!isNil(this.diskFileSystemStatusPeriodicRefetchSubscription)) {
      this.diskFileSystemStatusPeriodicRefetchSubscription.unsubscribe();
    }
    if (!isEmpty(this.networkInterfaceStatusBehaviorSubjectSubscriptions)) {
      for (const networkInterfaceStatusBehaviorSubjectSubscription of this.networkInterfaceStatusBehaviorSubjectSubscriptions) {
        if (!isNil(networkInterfaceStatusBehaviorSubjectSubscription)) {
          networkInterfaceStatusBehaviorSubjectSubscription.unsubscribe();
        }
      }
    }
    if (!isNil(this.networkInterfaceStatusPeriodicRefetchSubscription)) {
      this.networkInterfaceStatusPeriodicRefetchSubscription.unsubscribe();
    }
  }

  openChartModal() {
    this.chartModalRef = this.modalService.show(
      RealTimeChartModalComponent,
      {
        class: 'modal-xl'
      });
    this.chartModalRef.content.chartData = [];
    forEach(ChartData, (chartDataItem) => {
      this.chartModalRef.content.chartData.push(
        {
          name: chartDataItem.name,
          series: includes(this.selectedChartItems, chartDataItem.name) ?
            invoke(this, chartDataItem.seriesMethod) : []
        }
      );
    });
    if (!isNil(get(this.raspberryPi, 'network.networkInterfaces'))) {
      forEach(this.raspberryPi.network.networkInterfaces, (networkInterface) => {
        const interfaceName = networkInterface.name;
        this.chartModalRef.content.chartData.push(
          {
            name: `Network ${interfaceName} Rx (B/s)`,
            series: includes(this.selectedChartItems, `Network ${interfaceName} Rx (B/s)`) ?
              this.getOrderedAndMappedRxNetworkInterfaceNormalizedStatuses(interfaceName) : []
          }
        );
        this.chartModalRef.content.chartData.push(
          {
            name: `Network ${interfaceName} Tx (B/s)`,
            series: includes(this.selectedChartItems, `Network ${interfaceName} Tx (B/s)`) ?
              this.getOrderedAndMappedTxNetworkInterfaceNormalizedStatuses(interfaceName) : []
          }
        );
      });
    }
    this.chartModalRef.content.chartData = [...this.chartModalRef.content.chartData];
  }

  reboot() {
    this.raspberryPiService.rebootRaspberryPi()
      .pipe(take(1))
      .subscribe(
        result => {
          if (result) {
            this.alert = { message: 'Rebooting...', type: 'success', logout: true };
          }
          else {
            this.alert = { message: 'Error trying to reboot', type: 'danger', logout: false };
          }
        },
        error => this.alert = { message: error, type: 'danger', logout: false }
      );
  }

  shutdown() {
    this.raspberryPiService.shutdownRaspberryPi()
      .pipe(take(1))
      .subscribe(
        result => {
          if (result) {
            this.alert = { message: 'Shutting down...', type: 'success', logout: true };
          }
          else {
            this.alert = { message: 'Error trying to shutdown', type: 'danger', logout: false };
          }
        },
        error => this.alert = { message: error, type: 'danger', logout: false }
      );
  }

  update() {
    this.raspberryPiService.updateRaspberryPi()
      .pipe(take(1))
      .subscribe(
        (result) => {
          if (result) {
            this.alert = { message: 'Raspberry Pi firmware updated', type: 'success', logout: false };
          }
          else {
            this.alert = { message: 'Raspberry Pi firmware already up-to-date', type: 'info', logout: false };
          }
        },
        (error) => this.alert = { message: error, type: 'danger', logout: false },
        () => this.raspberryPi.os.upgradeablePackages = 0
      );
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  killProcess(processId: number): void {
    this.raspberryPiService.killProcess(processId)
      .pipe(take(1))
      .subscribe(
        result => {
          if (result) {
            this.alert = { message: `Process #${processId} killed`, type: 'info', logout: false };
          }
          else {
            this.alert = { message: `Process #${processId} was already terminated`, type: 'warning', logout: false };
          }
          this.raspberryPi.cpu.loadStatus.processes =
            remove(
              this.raspberryPi.cpu.loadStatus.processes,
              (process) => process.processId !== processId);
        },
        error => this.alert = { message: error, type: 'danger', logout: false }
      );
  }

  isAuthorizedToKill(processOwnerUsername: string) {
    if (this.isSuperUser) {
      return true;
    }
    const username = this.authService.getLoggedInUsername();
    if (endsWith(processOwnerUsername, '+')) {
      return startsWith(username, trimEnd(processOwnerUsername, '+'));
    }
    return username === processOwnerUsername;
  }

  overclock(cpuMaxFrequencyLevel: CpuMaxFrequencyLevel) {
    this.raspberryPiService.overclockRaspberryPi(cpuMaxFrequencyLevel)
      .pipe(take(1))
      .subscribe(
        result => {
          if (result) {
            this.alert = { message: `Raspberry Pi overclocked to ${CpuMaxFrequencyLevel[cpuMaxFrequencyLevel]} level, rebooting...`, type: 'success', logout: true };
          }
          else {
            this.alert = { message: `Raspberry Pi already overclocked to ${CpuMaxFrequencyLevel[cpuMaxFrequencyLevel]} level`, type: 'warning', logout: false };
          }
        },
        error => this.alert = { message: error, type: 'danger', logout: false }
      );
  }

  openTerminal() {
    if (this.raspberryPi.os.sshStarted) {
      this.router.navigate(['/terminal']);
    }
    else {
      this.raspberryPiService.startSshServer()
        .pipe(take(1))
        .subscribe(
          result => {
            if (result) {
              console.log('SSH server service started');
              this.router.navigate(['/terminal']);
            }
            else {
              this.alert = { message: 'Error trying to start SSH server service', type: 'danger', logout: false };
            }
          },
          error => this.alert = { message: error, type: 'danger', logout: false }
        );
    }
  }

  getOrderedAndMappedCpuNormalizedFrequencies() {
    if (isNil(get(this.raspberryPi, 'cpu.frequencies'))) {
      return [];
    }
    const maxFrequency = max(map(this.raspberryPi.cpu.frequencies, 'value'));
    const minFrequency = min(map(this.raspberryPi.cpu.frequencies, 'value'));
    const frequencyData = map(this.raspberryPi.cpu.frequencies, (frequency: ICpuFrequency) => {
      return {
        value: maxFrequency === minFrequency ? 100 : 100 * ((frequency.value - minFrequency) / (maxFrequency - minFrequency)),
        name: new Date(frequency.dateTime),
        absoluteValue: frequency.value
      };
    });
    return orderBy(frequencyData, 'name');
  }

  getOrderedAndMappedCpuTemperatures() {
    if (isNil(get(this.raspberryPi, 'cpu.sensorsStatuses'))) {
      return [];
    }
    const temperatureData = map(this.raspberryPi.cpu.sensorsStatuses, (sensorsStatus: ICpuSensorsStatus) => {
      return {
        value: sensorsStatus.temperature,
        name: new Date(sensorsStatus.dateTime)
      };
    });
    return orderBy(temperatureData, 'name');
  }

  getOrderedAndMappedCpuLoadStatuses() {
    if (isNil(get(this.raspberryPi, 'cpu.loadStatuses'))) {
      return [];
    }
    const loadStatusData = map(this.raspberryPi.cpu.loadStatuses, (loadStatus: ICpuLoadStatus) => {
      return {
        value: loadStatus.totalRealTime,
        name: new Date(loadStatus.dateTime),
        processes: orderBy(
          loadStatus.processes,
          ['cpuPercentage', 'ramPercentage'],
          ['desc', 'desc'])
      };
    });
    return orderBy(loadStatusData, 'name');
  }

  getOrderedAndMappedRamStatuses() {
    if (isNil(get(this.raspberryPi, 'ram.statuses'))) {
      return [];
    }
    const ramStatusData = map(this.raspberryPi.ram.statuses, (memoryStatus: IRandomAccessMemoryStatus) => {
      const total = memoryStatus.free + memoryStatus.used + memoryStatus.diskCache;
      return {
        value: total === 0 ? 0 : 100 * memoryStatus.used / total,
        name: new Date(memoryStatus.dateTime)
      };
    });
    return orderBy(ramStatusData, 'name');
  }

  getOrderedAndMappedSwapMemoryStatuses() {
    if (isNil(get(this.raspberryPi, 'swapMemory.statuses'))) {
      return [];
    }
    const swapMemoryStatusData = map(this.raspberryPi.swapMemory.statuses, (memoryStatus: IMemoryStatus) => {
      const total = memoryStatus.free + memoryStatus.used;
      return {
        value: total === 0 ? 0 : 100 * memoryStatus.used / total,
        name: new Date(memoryStatus.dateTime)
      };
    });
    return orderBy(swapMemoryStatusData, 'name');
  }

  getOrderedAndMappedRxNetworkInterfaceNormalizedStatuses(interfaceName: string) {
    if (isNil(get(this.raspberryPi, 'network.networkInterfaces'))) {
      return [];
    }
    const networkInterface = find(this.raspberryPi.network.networkInterfaces, { 'name': interfaceName });
    const maxReceiveSpeed = max(map(networkInterface.statuses, 'receiveSpeed'));
    const minReceiveSpeed = min(map(networkInterface.statuses, 'receiveSpeed'));
    const receiveSpeedData = map(networkInterface.statuses, (status: INetworkInterfaceStatus) => {
      return {
        value: maxReceiveSpeed === minReceiveSpeed ? 100 : 100 * ((status.receiveSpeed - minReceiveSpeed) / (maxReceiveSpeed - minReceiveSpeed)),
        name: new Date(status.dateTime),
        absoluteValue: status.receiveSpeed
      };
    });
    return orderBy(receiveSpeedData, 'name');
  }

  getOrderedAndMappedTxNetworkInterfaceNormalizedStatuses(interfaceName: string) {
    if (isNil(get(this.raspberryPi, 'network.networkInterfaces'))) {
      return [];
    }
    const networkInterface = find(this.raspberryPi.network.networkInterfaces, { 'name': interfaceName });
    const maxSendSpeed = max(map(networkInterface.statuses, 'sendSpeed'));
    const minSendSpeed = min(map(networkInterface.statuses, 'sendSpeed'));
    const sendSpeedData = map(networkInterface.statuses, (status: INetworkInterfaceStatus) => {
      return {
        value: maxSendSpeed === minSendSpeed ? 100 : 100 * ((status.sendSpeed - minSendSpeed) / (maxSendSpeed - minSendSpeed)),
        name: new Date(status.dateTime),
        absoluteValue: status.sendSpeed
      };
    });
    return orderBy(sendSpeedData, 'name');
  }

  getLoadAverageGaugeChartData() {
    let colors = ['#99E9C0', '#8DC6A9', '#74A58C'];
    if (this.raspberryPi.cpu.loadStatus.lastMinuteAverage > 0.8 * this.raspberryPi.cpu.cores) {
      if (this.raspberryPi.cpu.loadStatus.lastMinuteAverage <= this.raspberryPi.cpu.loadStatus.last5MinutesAverage &&
        this.raspberryPi.cpu.loadStatus.lastMinuteAverage <= this.raspberryPi.cpu.loadStatus.last15MinutesAverage) {
        colors = ['#98BCDE', '#89A9C6', '#748DA5'];
      } else if (this.raspberryPi.cpu.loadStatus.lastMinuteAverage > this.raspberryPi.cpu.loadStatus.last5MinutesAverage &&
        this.raspberryPi.cpu.loadStatus.lastMinuteAverage > this.raspberryPi.cpu.loadStatus.last15MinutesAverage) {
        colors = ['#E79191', '#C08484', '#9D6C6C'];
      } else {
        colors = ['#E2D891', '#C4BC83', '#9E9266'];
      }
    }
    return {
      results:
        [
          { name: 'Last minute load average', value: this.raspberryPi.cpu.loadStatus.lastMinuteAverage },
          { name: 'Last 5 minutes load average', value: this.raspberryPi.cpu.loadStatus.last5MinutesAverage },
          { name: 'Last 15 minutes load average', value: this.raspberryPi.cpu.loadStatus.last15MinutesAverage }
        ],
      colors:
        [
          { name: 'Last minute load average', value: colors[0] },
          { name: 'Last 5 minutes load average', value: colors[1] },
          { name: 'Last 15 minutes load average', value: colors[2] }
        ],
      maxScaleValue: max([
        this.raspberryPi.cpu.cores,
        this.raspberryPi.cpu.loadStatus.lastMinuteAverage,
        this.raspberryPi.cpu.loadStatus.last5MinutesAverage,
        this.raspberryPi.cpu.loadStatus.last15MinutesAverage
      ])
    };
  }

  getNetworkInterfaceSpeedGaugeChartData(status: INetworkInterfaceStatus) {
    return [
      { name: 'Receive Speed', value: status.receiveSpeed },
      { name: 'Send Speed', value: status.sendSpeed }];
  }

  formatNetworkInterfaceSpeedValue(speed) {
    return `${(new BytesPipe()).transform(speed)}/s`;
  }

  formatNetworkInterfaceSpeedAxisTick(speed) {
    return `${(new BytesPipe()).transform(toNumber(speed.replace(/,/g, '')), 1)}/s`;
  }

  closeAlert() {
    if (this.alert.logout) {
      this.logout();
    }
    this.alert = null;
  }

}
