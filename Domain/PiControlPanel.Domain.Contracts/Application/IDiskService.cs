﻿namespace PiControlPanel.Domain.Contracts.Application
{
    using System.Threading.Tasks;
    using PiControlPanel.Domain.Models.Hardware.Disk;
    using PiControlPanel.Domain.Models.Paging;

    public interface IDiskService : IBaseService<Disk>
    {
        Task<DiskStatus> GetLastStatusAsync();

        Task<PagingOutput<DiskStatus>> GetStatusesAsync(PagingInput pagingInput);

        Task SaveStatusAsync();

    }
}