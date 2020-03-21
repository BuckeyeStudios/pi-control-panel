﻿namespace PiControlPanel.Api.GraphQL.Types.Output.Cpu
{
    using global::GraphQL.Types;
    using NLog;
    using PiControlPanel.Api.GraphQL.Extensions;
    using PiControlPanel.Domain.Contracts.Application;
    using PiControlPanel.Domain.Models.Hardware.Cpu;

    public class CpuType : ObjectGraphType<Cpu>
    {
        public CpuType(ICpuService cpuService, ILogger logger)
        {
            Field(x => x.Cores);
            Field(x => x.Model);

            Field<CpuAverageLoadType>()
                .Name("AverageLoad")
                .ResolveAsync(async context =>
                {
                    logger.Info("Average Load field");
                    GraphQLUserContext graphQLUserContext = context.UserContext as GraphQLUserContext;
                    var businessContext = graphQLUserContext.GetBusinessContext();

                    return await cpuService.GetLastAverageLoadAsync();
                });

            Connection<CpuAverageLoadType>()
                .Name("AverageLoads")
                .Bidirectional()
                .ResolveAsync(async context =>
                {
                    logger.Info("AverageLoads connection");
                    GraphQLUserContext graphQLUserContext = context.UserContext as GraphQLUserContext;
                    var businessContext = graphQLUserContext.GetBusinessContext();

                    var pagingInput = context.GetPagingInput();
                    var averageLoads = await cpuService.GetAverageLoadsAsync(pagingInput);

                    return averageLoads.ToConnection();
                });

            Field<CpuRealTimeLoadType>()
                .Name("RealTimeLoad")
                .ResolveAsync(async context =>
                {
                    logger.Info("Real Time Load field");
                    GraphQLUserContext graphQLUserContext = context.UserContext as GraphQLUserContext;
                    var businessContext = graphQLUserContext.GetBusinessContext();

                    return await cpuService.GetLastRealTimeLoadAsync();
                });

            Connection<CpuRealTimeLoadType>()
                .Name("RealTimeLoads")
                .Bidirectional()
                .ResolveAsync(async context =>
                {
                    logger.Info("RealTimeLoads connection");
                    GraphQLUserContext graphQLUserContext = context.UserContext as GraphQLUserContext;
                    var businessContext = graphQLUserContext.GetBusinessContext();

                    var pagingInput = context.GetPagingInput();
                    var realTimeLoads = await cpuService.GetRealTimeLoadsAsync(pagingInput);

                    return realTimeLoads.ToConnection();
                });

            Field<CpuTemperatureType>()
                .Name("Temperature")
                .ResolveAsync(async context =>
                {
                    logger.Info("Temperature field");
                    GraphQLUserContext graphQLUserContext = context.UserContext as GraphQLUserContext;
                    var businessContext = graphQLUserContext.GetBusinessContext();

                    return await cpuService.GetLastTemperatureAsync();
                });

            Connection<CpuTemperatureType>()
                .Name("Temperatures")
                .Bidirectional()
                .ResolveAsync(async context =>
                {
                    logger.Info("Temperatures connection");
                    GraphQLUserContext graphQLUserContext = context.UserContext as GraphQLUserContext;
                    var businessContext = graphQLUserContext.GetBusinessContext();

                    var pagingInput = context.GetPagingInput();
                    var temperatures = await cpuService.GetTemperaturesAsync(pagingInput);

                    return temperatures.ToConnection();
                });
        }
    }
}