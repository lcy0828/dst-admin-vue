export const weatherMessages = {
  'zh-CN': { weather: {
    menu: '主题与天气', enabled: '全屏天气动画',
    scope: '全站跟随当前房间的主分片', noData: '主分片暂无实时天气',
    following: '{room} / {world} · {weather}', paused: '游戏已暂停',
    preview: '预览效果 · 10 秒', previewRain: '预览下雨', previewSnow: '预览下雪', stopPreview: '结束预览',
    previewing: '天气预览：{weather}（10 秒）', reducedMotion: '系统已减少动画，显示静态背景',
    controls: {
      button: '天气', active: '手动天气', title: '天气效果', description: '独立于明暗主题，仅影响页面效果。',
      mode: '天气模式', modes: { off: '关闭', automatic: '动态天气', manual: '手动' },
      offDescription: '天气效果已关闭。选择动态天气跟随房间，或手动调整。', followRoom: '恢复跟随房间',
      collapse: '收起面板', season: '季节', phase: '昼夜', precipitation: '天气', intensity: '雨雪强度',
      pause: '暂停动画', play: '播放动画',
      seasons: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
      phases: { day: '白天', dusk: '黄昏', night: '夜晚' },
      conditions: { none: '晴天', rain: '下雨', snow: '下雪', acid_rain: '酸雨' }
    },
    conditions: { none: '无降水', rain: '下雨', snow: '下雪', acid_rain: '酸雨', lunar_hail: '月石雹', unknown: '天气未知' }
  } },
  'en-US': { weather: {
    menu: 'Theme and weather', enabled: 'Full-screen weather',
    scope: 'Follow the selected room’s master shard across pages', noData: 'No live weather from the master shard',
    following: '{room} / {world} · {weather}', paused: 'Game paused',
    preview: 'Preview · 10 seconds', previewRain: 'Preview rain', previewSnow: 'Preview snow', stopPreview: 'End preview',
    previewing: 'Weather preview: {weather} (10 seconds)', reducedMotion: 'Reduced motion is on. Showing a static background.',
    controls: {
      button: 'Weather', active: 'Manual weather', title: 'Weather effects', description: 'Independent of light and dark themes. Page effects only.',
      mode: 'Weather mode', modes: { off: 'Off', automatic: 'Dynamic', manual: 'Manual' },
      offDescription: 'Weather effects are off. Follow the room with Dynamic, or adjust them manually.', followRoom: 'Follow room again',
      collapse: 'Hide panel', season: 'Season', phase: 'Time of day', precipitation: 'Weather', intensity: 'Rain / snow intensity',
      pause: 'Pause animation', play: 'Play animation',
      seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
      phases: { day: 'Day', dusk: 'Dusk', night: 'Night' },
      conditions: { none: 'Clear', rain: 'Rain', snow: 'Snow', acid_rain: 'Acid rain' }
    },
    conditions: { none: 'No precipitation', rain: 'Rain', snow: 'Snow', acid_rain: 'Acid rain', lunar_hail: 'Lunar hail', unknown: 'Unknown weather' }
  } }
}
