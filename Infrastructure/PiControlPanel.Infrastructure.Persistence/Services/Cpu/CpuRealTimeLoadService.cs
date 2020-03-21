﻿namespace PiControlPanel.Infrastructure.Persistence.Services.Cpu
{
    using AutoMapper;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.Extensions.Configuration;
    using NLog;
    using PiControlPanel.Domain.Contracts.Infrastructure.Persistence.Cpu;
    using PiControlPanel.Domain.Models.Hardware.Cpu;
    using PiControlPanel.Infrastructure.Persistence.Contracts.Repositories;
    using PiControlPanel.Infrastructure.Persistence.Repositories;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;

    public class CpuRealTimeLoadService :
        BaseTimedService<CpuRealTimeLoad, Entities.Cpu.CpuRealTimeLoad>,
        ICpuRealTimeLoadService
    {
        private readonly IConfiguration configuration;

        public CpuRealTimeLoadService(IConfiguration configuration, IUnitOfWork unitOfWork,
            IMapper mapper, ILogger logger)
            : base(unitOfWork, mapper, logger)
        {
            this.configuration = configuration;
            this.repository = unitOfWork.CpuRealTimeLoadRepository;
        }

        /// <summary>
        ///     Gets the RealTimeLoads from the list of datetimes
        /// </summary>
        /// <remarks>
        ///     The unit of work is being created manually instead of relying on the dependency injection
        ///     lifetime due to existing issues with GraphQL dataloader.
        ///     https://github.com/graphql-dotnet/graphql-dotnet/pull/1511
        ///     https://github.com/graphql-dotnet/graphql-dotnet/issues/1310
        ///     Once they are addressed, this can be changed to get the unit of work directly in the
        ///     constructor via dependency injection
        /// </remarks>
        /// <param name="dateTimes">List of datetimes for which to fetch the RealTimeLoads</param>
        /// <returns>A dictionary containg the datetimes as keys and the RealTimeLoads as values</returns>
        public async Task<IDictionary<DateTime, CpuRealTimeLoad>> GetRealTimeLoadsAsync(
            IEnumerable<DateTime> dateTimes)
        {
            using (var unitOfWork = new UnitOfWork(this.configuration, this.logger))
            {
                var repository = unitOfWork.CpuRealTimeLoadRepository;
                var entities = await repository.GetMany(l => dateTimes.Contains(l.DateTime))
                    .ToDictionaryAsync(i => i.DateTime, i => i);
                return mapper.Map<Dictionary<DateTime, CpuRealTimeLoad>>(entities);
            }
        }
    }
}