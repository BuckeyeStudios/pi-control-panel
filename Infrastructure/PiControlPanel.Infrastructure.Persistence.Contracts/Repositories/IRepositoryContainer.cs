﻿namespace PiControlPanel.Infrastructure.Persistence.Contracts.Repositories
{
    public interface IRepositoryContainer
    {
        IRepositoryBase<Entities.Chipset> ChipsetRepository { get; }

        IRepositoryBase<Entities.Cpu.Cpu> CpuRepository { get; }

        IRepositoryBase<Entities.Cpu.CpuTemperature> CpuTemperatureRepository { get; }

        IRepositoryBase<Entities.Cpu.CpuAverageLoad> CpuAverageLoadRepository { get; }

        IRepositoryBase<Entities.Cpu.CpuRealTimeLoad> CpuRealTimeLoadRepository { get; }

        IRepositoryBase<Entities.Gpu> GpuRepository { get; }

        IRepositoryBase<Entities.Os> OsRepository { get; }

        IRepositoryBase<Entities.Disk.Disk> DiskRepository { get; }

        IRepositoryBase<Entities.Disk.DiskStatus> DiskStatusRepository { get; }

        IRepositoryBase<Entities.Memory.Memory> MemoryRepository { get; }

        IRepositoryBase<Entities.Memory.MemoryStatus> MemoryStatusRepository { get; }
    }
}