/**
 * 将日期格式化为指定格式的字符串
 * @param {Date|string|number} date 日期对象、日期字符串或时间戳
 * @param {string} format 格式字符串，支持以下占位符:
 * @returns {string} 格式化后的日期字符串*/
export function formatDate(date, format = 'yyyy-MM-dd HH:mm:ss') {
  if (typeof date === 'string') {
    date = new Date(date.replace(/-/g, '/'));
  } else if (typeof date === 'number') {
    date = new Date(date);
  } else if (!(date instanceof Date)) {
    date = new Date();
  }
  
  if (isNaN(date.getTime())) {
    console.error('无效的日期:', date);
    return '';
  }
  
  const formatObj = {
    yyyy: date.getFullYear(),
    MM: padZero(date.getMonth() + 1, 2),
    dd: padZero(date.getDate(), 2),
    HH: padZero(date.getHours(), 2),
    hh: padZero(date.getHours() % 12 || 12, 2),
    mm: padZero(date.getMinutes(), 2),
    ss: padZero(date.getSeconds(), 2),
    SSS: padZero(date.getMilliseconds(), 3),
    A: date.getHours() < 12 ? 'AM' : 'PM',
    a: date.getHours() < 12 ? 'am' : 'pm',
    q: Math.floor((date.getMonth() + 3) / 3),
    w: date.getDay(),
    WW: getWeekOfYear(date)
  };
  
  return format.replace(/yyyy|MM|dd|HH|hh|mm|ss|SSS|A|a|q|w|WW/g, (match) => {
    return formatObj[match] !== undefined ? formatObj[match] : match;
  });
}

/**
 * 数字前补零
 * @param {number} num 数字
 * @param {number} targetLength 目标长度
 * @returns {string} 补零后的字符串
 */
function padZero(num, targetLength) {
  let str = num.toString();
  while (str.length < targetLength) {
    str = '0' + str;
  }
  return str;
}

/**
 * 获取日期是一年中的第几周
 * @param {Date} date 日期
 * @returns {string} 周数（两位数）
 */
function getWeekOfYear(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - firstDay) / (24 * 60 * 60 * 1000)) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return padZero(week, 2);
}

/**
 * 获取相对时间描述，如"刚刚"、"5分钟前"等
 * @param {Date|string|number} date 日期
 * @returns {string} 相对时间描述
 */
export function getRelativeTime(date) {
  if (!(date instanceof Date)) {
    if (typeof date === 'string') {
      date = new Date(date.replace(/-/g, '/'));
    } else if (typeof date === 'number') {
      date = new Date(date);
    } else {
      return '';
    }
  }
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 0) {
    return formatDate(date);
  }
  
  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < month) {
    return Math.floor(diff / day) + '天前';
  } else if (diff < year) {
    return Math.floor(diff / month) + '个月前';
  } else {
    return Math.floor(diff / year) + '年前';
  }
} 