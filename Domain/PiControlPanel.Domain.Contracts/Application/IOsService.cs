﻿namespace PiControlPanel.Domain.Contracts.Application
{
    using System.Threading.Tasks;
    using PiControlPanel.Domain.Models.Hardware;

    public interface IOsService
    {
        Task<Os> GetAsync();

        Task SaveAsync();
    }
}
