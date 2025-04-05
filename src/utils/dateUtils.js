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
  } else {
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

/**
 * 获取当前日期的开始时间
 * @param {Date} [date=new Date()] 日期对象
 * @returns {Date} 日期的开始时间
 */
export function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 获取当前日期的结束时间
 * @param {Date} [date=new Date()] 日期对象
 * @returns {Date} 日期的结束时间
 */
export function getEndOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * 日期加减
 * @param {Date} date 日期对象
 * @param {number} amount 加减的数量
 * @param {string} unit 单位：year, month, day, hour, minute, second
 * @returns {Date} 新的日期对象
 */
export function addDate(date, amount, unit) {
  const newDate = new Date(date);
  
  switch (unit) {
    case 'year':
      newDate.setFullYear(newDate.getFullYear() + amount);
      break;
    case 'month':
      newDate.setMonth(newDate.getMonth() + amount);
      break;
    case 'day':
      newDate.setDate(newDate.getDate() + amount);
      break;
    case 'hour':
      newDate.setHours(newDate.getHours() + amount);
      break;
    case 'minute':
      newDate.setMinutes(newDate.getMinutes() + amount);
      break;
    case 'second':
      newDate.setSeconds(newDate.getSeconds() + amount);
      break;
    default:
      console.error('不支持的时间单位:', unit);
  }
  
  return newDate;
} 

/**
 * 格式化时间差，显示为友好的时间格式
 * @param {number} milliseconds 时间差（毫秒）
 * @returns {string} 格式化后的时间差字符串
 */
export function formatTimeDiff(milliseconds) {
  // 处理负数情况（未来日期）
  if (milliseconds < 0) {
    return '未来时间';
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // 计算剩余部分
  const remainingDays = days % 30;
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (minutes < 60) {
    return `${minutes}分${remainingSeconds}秒`;
  } else if (hours < 24) {
    return `${hours}小时${remainingMinutes}分`;
  } else if (days < 30) {
    return `${days}天${remainingHours}小时`;
  } else if (months < 12) {
    return `${months}个月${remainingDays}天`;
  } else {
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? 
      `${years}年${remainingMonths}个月` : 
      `${years}年`;
  }
}