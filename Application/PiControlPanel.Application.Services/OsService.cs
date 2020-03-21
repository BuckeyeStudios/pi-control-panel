﻿namespace PiControlPanel.Application.Services
{
    using NLog;
    using PiControlPanel.Domain.Contracts.Application;
    using PiControlPanel.Domain.Models.Hardware;
    using OnDemand = PiControlPanel.Domain.Contracts.Infrastructure.OnDemand;
    using Persistence = PiControlPanel.Domain.Contracts.Infrastructure.Persistence;

    public class OsService : BaseService<Os>, IOsService
    {
        public OsService(
            Persistence.IOsService persistenceService,
            OnDemand.IOsService onDemandService,
            ILogger logger)
            : base(persistenceService, onDemandService, logger)
        {
        }
    }
}