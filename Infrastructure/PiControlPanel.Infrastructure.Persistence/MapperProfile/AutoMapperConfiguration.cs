﻿namespace PiControlPanel.Infrastructure.Persistence.MapperProfile
{
    using AutoMapper;
    using Models = PiControlPanel.Domain.Models.Hardware;

    public class AutoMapperConfiguration
    {
        public MapperConfiguration GetAutoMapperProfiles()
        {
            var config = new MapperConfiguration(
                cfg =>
                {
                    cfg.CreateMap<Models.Chipset, Entities.Chipset>()
                        .ReverseMap();
                    cfg.CreateMap<Models.Cpu.Cpu, Entities.Cpu.Cpu>()
                        .ReverseMap();
                    cfg.CreateMap<Models.Cpu.CpuTemperature, Entities.Cpu.CpuTemperature>()
                        .ReverseMap();
                    cfg.CreateMap<Models.Cpu.CpuAverageLoad, Entities.Cpu.CpuAverageLoad>()
                        .ReverseMap();
                    cfg.CreateMap<Models.Cpu.CpuRealTimeLoad, Entities.Cpu.CpuRealTimeLoad>()
                        .ReverseMap();
                    cfg.CreateMap<Models.Gpu, Entities.Gpu>()
                        .ForMember(x => x.ID, opt => opt.Ignore()).ReverseMap();
                    cfg.CreateMap<Models.Os, Entities.Os>()
                        .ForMember(x => x.ID, opt => opt.Ignore()).ReverseMap();
                    cfg.CreateMap<Models.Disk.Disk, Entities.Disk.Disk>().ReverseMap();
                    cfg.CreateMap<Models.Disk.DiskStatus, Entities.Disk.DiskStatus>()
                        .ReverseMap();
                    cfg.CreateMap<Models.Memory.Memory, Entities.Memory.Memory>()
                        .ForMember(x => x.ID, opt => opt.Ignore()).ReverseMap();
                    cfg.CreateMap<Models.Memory.MemoryStatus, Entities.Memory.MemoryStatus>()
                        .ReverseMap();
                }
            );
            return config;
        }

        public IMapper GetIMapper()
        {
            IMapper mapper = new Mapper(this.GetAutoMapperProfiles());
            return mapper;
        }
    }
}