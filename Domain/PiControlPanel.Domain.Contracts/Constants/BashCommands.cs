﻿namespace PiControlPanel.Domain.Contracts.Constants
{
    public class BashCommands
    {
        public const string MeasureTemp = "vcgencmd measure_temp";
        public const string SudoShutdown = "sudo shutdown -h now";
        public const string SudoCatEtcShadow = "sudo cat /etc/shadow | grep {0}";
        public const string OpenSslPasswd = "openssl passwd -{0} -salt {1} {2}";
        public const string CatProcCpuInfo = "cat /proc/cpuinfo";
        public const string Df = "df -T";
        public const string Free = "free --mega";
        public const string GetMemGpu = "vcgencmd get_mem gpu";
        public const string Top = "top -bc -n 1";
        public const string Hostnamectl = "hostnamectl";
        public const string Groups = "groups {0}";
    }
}
