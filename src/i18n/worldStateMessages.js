export const worldStateMessages = {
  'zh-CN': {
    worldState: {
      title: '世界状态',
      subtitle: '查询世界的季节、时间、天气和洞穴状态。',
      actions: {
        refresh: '刷新',
        query: '查询',
        retry: '重新加载',
        show: '显示',
        hide: '隐藏'
      },
      query: {
        title: '状态查询',
        description: '选择房间存档和世界分片。',
        archive: '存档名称',
        selectArchive: '请选择存档',
        world: '世界名称',
        selectWorld: '请选择世界',
        queryAria: '查询世界状态'
      },
      loadingAria: '正在读取世界状态',
      listSeparator: '，',
      error: {
        title: '世界状态读取失败',
        archiveList: '获取存档列表失败',
        worldState: '获取世界状态失败',
        withDetail: '{message}：{detail}',
        unknown: '未知错误'
      },
      empty: {
        title: '暂无世界状态',
        ready: '点击查询获取最新状态。',
        select: '请选择存档和世界。'
      },
      feedback: {
        selectArchiveAndWorld: '请选择存档和世界',
        loaded: '世界状态已更新'
      },
      freshness: {
        staleTitle: '当前展示的不是实时数据'
      },
      cards: {
        season: '季节',
        worldDays: '世界天数 {days}',
        surfaceTime: '地表时间',
        phaseProgress: '当前阶段进度：{progress}',
        dayProgress: '全天进度 {progress}',
        surfaceWeather: '地表天气',
        temperature: '温度 {temperature}',
        surfaceMoon: '地表月相',
        caveTime: '洞穴时间',
        caveTimeDescription: '当前洞穴时间阶段',
        caveMoon: '洞穴月相',
        nightmare: '梦魇循环'
      },
      seasonProgress: {
        title: '地表季节进度',
        summary: '已过 {elapsed} 天 / 剩余 {remaining} 天',
        detail: '已过 {elapsed} 天 / 剩余 {remaining} 天（进度：{progress}）',
        length: '{season} {days} 天'
      },
      details: {
        title: '详细信息',
        description: '按属性、描述或分类筛选状态字段。',
        search: '搜索属性或描述',
        allCategories: '所有分类',
        columns: {
          property: '属性',
          value: '值',
          description: '描述'
        },
        categories: {
          basic: '基本信息',
          season: '季节信息',
          time: '时间信息',
          moon: '月相信息',
          weather: '天气信息',
          cave: '洞穴信息',
          nightmare: '梦魇循环信息',
          other: '其他信息'
        },
        fields: {
          archiveName: { name: '存档名称', description: '游戏存档的名称' },
          worldName: { name: '世界名称', description: '当前世界的名称' },
          worldDays: { name: '世界天数', description: '从世界创建开始已经过的完整昼夜循环总数' },
          surfaceSeason: { name: '地表季节', description: '地表的当前季节' },
          elapsedSeasonDays: { name: '当前季节已过天数', description: '当前季节已经过去的天数' },
          remainingSeasonDays: { name: '当前季节剩余天数', description: '当前季节还剩余的天数' },
          seasonProgress: { name: '季节进度', description: '当前季节的进度（0-100%）' },
          isAutumn: { name: '是否秋季', description: '当前是否是秋季' },
          isWinter: { name: '是否冬季', description: '当前是否是冬季' },
          isSpring: { name: '是否春季', description: '当前是否是春季' },
          isSummer: { name: '是否夏季', description: '当前是否是夏季' },
          autumnLength: { name: '秋季长度', description: '秋季设定持续的总天数' },
          winterLength: { name: '冬季长度', description: '冬季设定持续的总天数' },
          springLength: { name: '春季长度', description: '春季设定持续的总天数' },
          summerLength: { name: '夏季长度', description: '夏季设定持续的总天数' },
          surfacePhase: { name: '地表时间阶段', description: '地表的当前时间阶段（白天、黄昏或夜晚）' },
          isDay: { name: '是否白天', description: '地表当前是否是白天' },
          isDusk: { name: '是否黄昏', description: '地表当前是否是黄昏' },
          isNight: { name: '是否夜晚', description: '地表当前是否是夜晚' },
          phaseProgress: { name: '当前阶段进度', description: '当前时间阶段内的进度（0-100%）' },
          dayProgress: { name: '全天进度', description: '整个昼夜循环的当前进度（0-100%）' },
          surfaceMoon: { name: '地表月相', description: '地表的当前月相' },
          isFullMoon: { name: '是否满月', description: '地表当前是否是满月' },
          isNewMoon: { name: '是否新月', description: '地表当前是否是新月' },
          isWaxingMoon: { name: '是否渐盈期', description: '地表月亮当前是否处于渐盈状态' },
          surfaceTemperature: { name: '地表温度', description: '当前世界的环境温度' },
          precipitationType: { name: '降水类型', description: '当前的降水类型' },
          precipitationChance: { name: '降水概率', description: '当前发生降水的概率' },
          isRaining: { name: '是否下雨', description: '当前是否正在下雨' },
          isSnowing: { name: '是否下雪', description: '当前是否正在下雪' },
          isAcidRaining: { name: '是否下酸雨', description: '当前是否正在下酸雨' },
          isLunarHailing: { name: '是否下月石雹', description: '当前是否正在下月石雹' },
          lunarHailLevel: { name: '月石雹等级', description: '月石雹的强度等级' },
          wetness: { name: '湿度', description: '影响玩家角色的潮湿度等级' },
          isWet: { name: '是否潮湿', description: '世界环境当前是否普遍潮湿' },
          moisture: { name: '水分', description: '当前世界的水分值和上限' },
          snowLevel: { name: '雪量', description: '当前地面积雪的程度' },
          isSnowCovered: { name: '是否被雪覆盖', description: '地表是否被雪覆盖' },
          cavePhase: { name: '洞穴时间阶段', description: '洞穴中的当前时间阶段' },
          isCaveDay: { name: '洞穴是否白天', description: '洞穴中当前是否是白天' },
          isCaveDusk: { name: '洞穴是否黄昏', description: '洞穴中当前是否是黄昏' },
          isCaveNight: { name: '洞穴是否夜晚', description: '洞穴中当前是否是夜晚' },
          caveMoon: { name: '洞穴月相', description: '洞穴中的当前月相' },
          isCaveFullMoon: { name: '洞穴是否满月', description: '洞穴中当前是否是满月' },
          isCaveNewMoon: { name: '洞穴是否新月', description: '洞穴中当前是否是新月' },
          isCaveWaxingMoon: { name: '洞穴是否渐盈期', description: '洞穴月亮当前是否处于渐盈状态' },
          nightmarePhase: { name: '梦魇循环阶段', description: '当前梦魇循环的阶段' },
          isNightmareCalm: { name: '是否梦魇平静期', description: '梦魇循环当前是否处于平静阶段' },
          isNightmareWild: { name: '是否梦魇黑暗期', description: '梦魇循环当前是否处于黑暗阶段' },
          isNightmareWarn: { name: '是否梦魇警告期', description: '梦魇循环当前是否处于警告阶段' },
          isNightmareDawn: { name: '是否梦魇黎明期', description: '梦魇循环当前是否处于黎明阶段' },
          nightmareTime: { name: '梦魇循环时间', description: '在当前梦魇循环状态下经过的总时间' },
          nightmarePhaseTime: { name: '梦魇循环阶段时间', description: '在当前梦魇循环单个阶段内经过的时间' },
          alterAwake: { name: '月亮祈坛是否激活', description: '月亮祈坛或天体英雄是否处于激活状态' }
        }
      },
      raw: {
        title: '原始数据',
        description: '后端返回的原始世界状态。'
      },
      values: {
        unknown: '未知',
        unknownState: '未知状态',
        yes: '是',
        no: '否',
        seasons: { autumn: '秋季', winter: '冬季', spring: '春季', summer: '夏季' },
        phases: { day: '白天', dusk: '黄昏', night: '夜晚' },
        weather: { none: '无降水', rain: '下雨', snow: '下雪', acid_rain: '酸雨', lunar_hail: '月石雹' },
        precipitation: { none: '无', rain: '雨', snow: '雪', acid_rain: '酸雨', lunar_hail: '月石雹' },
        moon: { new: '新月', quarter: '弦月', half: '半月', threequarter: '盈凸月', full: '满月' },
        moonState: { waxing: '渐盈期', waning: '渐亏期' },
        nightmare: { calm: '平静期', warn: '警告期', wild: '黑暗期', dawn: '黎明期', none: '无效期' }
      },
      weatherDetail: {
        precipitationType: '降水类型：{value}',
        precipitationChance: '降水概率：{value}',
        wetness: '湿度：{value}',
        snowLevel: '雪量：{value}',
        snowCovered: '地面被雪覆盖'
      }
    }
  },
  'en-US': {
    worldState: {
      title: 'World State',
      subtitle: 'Inspect the world season, time, weather, and cave state.',
      actions: {
        refresh: 'Refresh',
        query: 'Query',
        retry: 'Reload',
        show: 'Show',
        hide: 'Hide'
      },
      query: {
        title: 'State Query',
        description: 'Select a room archive and world shard.',
        archive: 'Archive',
        selectArchive: 'Select an archive',
        world: 'World',
        selectWorld: 'Select a world',
        queryAria: 'Query world state'
      },
      loadingAria: 'Loading world state',
      listSeparator: ', ',
      error: {
        title: 'Failed to load world state',
        archiveList: 'Failed to load the archive list',
        worldState: 'Failed to load world state',
        withDetail: '{message}: {detail}',
        unknown: 'Unknown error'
      },
      empty: {
        title: 'No world state available',
        ready: 'Query to get the latest state.',
        select: 'Select an archive and world.'
      },
      feedback: {
        selectArchiveAndWorld: 'Select an archive and world',
        loaded: 'World state updated'
      },
      freshness: {
        staleTitle: 'The displayed data is not live'
      },
      cards: {
        season: 'Season',
        worldDays: 'World days {days}',
        surfaceTime: 'Surface Time',
        phaseProgress: 'Current phase progress: {progress}',
        dayProgress: 'Day progress {progress}',
        surfaceWeather: 'Surface Weather',
        temperature: 'Temperature {temperature}',
        surfaceMoon: 'Surface Moon Phase',
        caveTime: 'Cave Time',
        caveTimeDescription: 'Current cave time phase',
        caveMoon: 'Cave Moon Phase',
        nightmare: 'Nightmare Cycle'
      },
      seasonProgress: {
        title: 'Surface Season Progress',
        summary: '{elapsed} days elapsed / {remaining} days remaining',
        detail: '{elapsed} days elapsed / {remaining} days remaining (progress: {progress})',
        length: '{season}: {days} days'
      },
      details: {
        title: 'Details',
        description: 'Filter state fields by property, description, or category.',
        search: 'Search properties or descriptions',
        allCategories: 'All categories',
        columns: {
          property: 'Property',
          value: 'Value',
          description: 'Description'
        },
        categories: {
          basic: 'Basic information',
          season: 'Season information',
          time: 'Time information',
          moon: 'Moon phase information',
          weather: 'Weather information',
          cave: 'Cave information',
          nightmare: 'Nightmare cycle information',
          other: 'Other information'
        },
        fields: {
          archiveName: { name: 'Archive', description: 'Name of the game archive' },
          worldName: { name: 'World', description: 'Name of the current world' },
          worldDays: { name: 'World Days', description: 'Completed day-night cycles since the world was created' },
          surfaceSeason: { name: 'Surface Season', description: 'Current season on the surface' },
          elapsedSeasonDays: { name: 'Elapsed Season Days', description: 'Days elapsed in the current season' },
          remainingSeasonDays: { name: 'Remaining Season Days', description: 'Days remaining in the current season' },
          seasonProgress: { name: 'Season Progress', description: 'Progress through the current season (0-100%)' },
          isAutumn: { name: 'Is Autumn', description: 'Whether the current season is autumn' },
          isWinter: { name: 'Is Winter', description: 'Whether the current season is winter' },
          isSpring: { name: 'Is Spring', description: 'Whether the current season is spring' },
          isSummer: { name: 'Is Summer', description: 'Whether the current season is summer' },
          autumnLength: { name: 'Autumn Length', description: 'Configured total number of autumn days' },
          winterLength: { name: 'Winter Length', description: 'Configured total number of winter days' },
          springLength: { name: 'Spring Length', description: 'Configured total number of spring days' },
          summerLength: { name: 'Summer Length', description: 'Configured total number of summer days' },
          surfacePhase: { name: 'Surface Time Phase', description: 'Current surface phase (day, dusk, or night)' },
          isDay: { name: 'Is Day', description: 'Whether it is currently day on the surface' },
          isDusk: { name: 'Is Dusk', description: 'Whether it is currently dusk on the surface' },
          isNight: { name: 'Is Night', description: 'Whether it is currently night on the surface' },
          phaseProgress: { name: 'Phase Progress', description: 'Progress through the current time phase (0-100%)' },
          dayProgress: { name: 'Day Progress', description: 'Progress through the full day-night cycle (0-100%)' },
          surfaceMoon: { name: 'Surface Moon Phase', description: 'Current moon phase on the surface' },
          isFullMoon: { name: 'Is Full Moon', description: 'Whether the surface currently has a full moon' },
          isNewMoon: { name: 'Is New Moon', description: 'Whether the surface currently has a new moon' },
          isWaxingMoon: { name: 'Is Waxing Moon', description: 'Whether the surface moon is currently waxing' },
          surfaceTemperature: { name: 'Surface Temperature', description: 'Current ambient world temperature' },
          precipitationType: { name: 'Precipitation Type', description: 'Current precipitation type' },
          precipitationChance: { name: 'Precipitation Chance', description: 'Current chance of precipitation' },
          isRaining: { name: 'Is Raining', description: 'Whether it is currently raining' },
          isSnowing: { name: 'Is Snowing', description: 'Whether it is currently snowing' },
          isAcidRaining: { name: 'Is Acid Raining', description: 'Whether acid rain is currently falling' },
          isLunarHailing: { name: 'Is Lunar Hailing', description: 'Whether lunar hail is currently falling' },
          lunarHailLevel: { name: 'Lunar Hail Level', description: 'Intensity level of lunar hail' },
          wetness: { name: 'Wetness', description: 'Wetness level that affects player characters' },
          isWet: { name: 'Is Wet', description: 'Whether the world environment is generally wet' },
          moisture: { name: 'Moisture', description: 'Current world moisture and its upper limit' },
          snowLevel: { name: 'Snow Level', description: 'Current amount of snow on the ground' },
          isSnowCovered: { name: 'Is Snow Covered', description: 'Whether the surface is covered in snow' },
          cavePhase: { name: 'Cave Time Phase', description: 'Current time phase in the caves' },
          isCaveDay: { name: 'Is Cave Day', description: 'Whether it is currently day in the caves' },
          isCaveDusk: { name: 'Is Cave Dusk', description: 'Whether it is currently dusk in the caves' },
          isCaveNight: { name: 'Is Cave Night', description: 'Whether it is currently night in the caves' },
          caveMoon: { name: 'Cave Moon Phase', description: 'Current moon phase in the caves' },
          isCaveFullMoon: { name: 'Is Cave Full Moon', description: 'Whether the caves currently have a full moon' },
          isCaveNewMoon: { name: 'Is Cave New Moon', description: 'Whether the caves currently have a new moon' },
          isCaveWaxingMoon: { name: 'Is Cave Moon Waxing', description: 'Whether the cave moon is currently waxing' },
          nightmarePhase: { name: 'Nightmare Cycle Phase', description: 'Current phase of the nightmare cycle' },
          isNightmareCalm: { name: 'Is Nightmare Calm', description: 'Whether the nightmare cycle is in its calm phase' },
          isNightmareWild: { name: 'Is Nightmare Wild', description: 'Whether the nightmare cycle is in its wild phase' },
          isNightmareWarn: { name: 'Is Nightmare Warning', description: 'Whether the nightmare cycle is in its warning phase' },
          isNightmareDawn: { name: 'Is Nightmare Dawn', description: 'Whether the nightmare cycle is in its dawn phase' },
          nightmareTime: { name: 'Nightmare Cycle Time', description: 'Total time elapsed in the current nightmare cycle state' },
          nightmarePhaseTime: { name: 'Nightmare Phase Time', description: 'Time elapsed within the current nightmare cycle phase' },
          alterAwake: { name: 'Is Lunar Altar Active', description: 'Whether the Lunar Altar or Celestial Champion is active' }
        }
      },
      raw: {
        title: 'Raw Data',
        description: 'Raw world state returned by the backend.'
      },
      values: {
        unknown: 'Unknown',
        unknownState: 'Unknown state',
        yes: 'Yes',
        no: 'No',
        seasons: { autumn: 'Autumn', winter: 'Winter', spring: 'Spring', summer: 'Summer' },
        phases: { day: 'Day', dusk: 'Dusk', night: 'Night' },
        weather: { none: 'No precipitation', rain: 'Raining', snow: 'Snowing', acid_rain: 'Acid rain', lunar_hail: 'Lunar hail' },
        precipitation: { none: 'None', rain: 'Rain', snow: 'Snow', acid_rain: 'Acid rain', lunar_hail: 'Lunar hail' },
        moon: { new: 'New Moon', quarter: 'Quarter Moon', half: 'Half Moon', threequarter: 'Waxing Gibbous', full: 'Full Moon' },
        moonState: { waxing: 'Waxing', waning: 'Waning' },
        nightmare: { calm: 'Calm', warn: 'Warning', wild: 'Wild', dawn: 'Dawn', none: 'Inactive' }
      },
      weatherDetail: {
        precipitationType: 'Precipitation: {value}',
        precipitationChance: 'Precipitation chance: {value}',
        wetness: 'Wetness: {value}',
        snowLevel: 'Snow level: {value}',
        snowCovered: 'Ground covered in snow'
      }
    }
  }
}

export function translateWorldStateValue(translate, hasTranslation, group, value) {
  if (value === undefined || value === null || value === '') {
    return translate('worldState.values.unknown')
  }

  const key = `worldState.values.${group}.${value}`
  return hasTranslation(key) ? translate(key) : value
}
