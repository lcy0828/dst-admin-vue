/**
 * API响应处理工具
 * 用于统一处理API返回的数据结构，确保组件获取到正确格式的数据
 */

/**
 * 处理API返回的数组数据
 * @param {Object} response - API响应对象
 * @param {String} dataKey - 数据字段名，默认为'data'
 * @returns {Array} 处理后的数组数据
 */
export const handleArrayResponse = (response, dataKey = 'data') => {
  if (!response) return [];

  // 直接是数组的情况
  if (Array.isArray(response)) {
    return response;
  }

  // response.data 是数组的情况
  if (response[dataKey] && Array.isArray(response[dataKey])) {
    return response[dataKey];
  }

  // response.data.data 是数组的情况
  if (response[dataKey] && response[dataKey][dataKey] && Array.isArray(response[dataKey][dataKey])) {
    return response[dataKey][dataKey];
  }

  // 其他情况，返回空数组
  console.warn('API返回的数据格式不是数组:', response);
  return [];
};

/**
 * 处理API返回的分页数据
 * @param {Object} response - API响应对象
 * @param {Object} pagination - 分页对象，包含page, page_size, total等字段
 * @param {String} dataKey - 数据字段名，默认为'data'
 * @param {String} totalKey - 总数字段名，默认为'total'
 * @returns {Object} 包含处理后的数组数据和分页信息
 */
export const handlePaginationResponse = (response, pagination, dataKey = 'data', totalKey = 'total') => {
  const result = {
    list: [],
    pagination: { ...pagination }
  };

  if (!response) return result;

  // 处理数据列表
  result.list = handleArrayResponse(response, dataKey);

  // 处理总数
  if (response[totalKey] !== undefined) {
    result.pagination.total = response[totalKey];
  } else if (response[dataKey] && response[dataKey][totalKey] !== undefined) {
    result.pagination.total = response[dataKey][totalKey];
  }

  return result;
};

/**
 * 标准化API响应
 * 用于统一处理API返回的数据结构
 * @param {Object} response - 原始API响应对象
 * @returns {Object} 标准化后的响应对象
 */
export const standardizeResponse = (response) => {
  if (!response) return { data: null };

  // 如果response本身就是标准格式，直接返回
  if (response.data !== undefined) {
    // 如果response.data是对象且包含data字段，说明是嵌套结构
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data) && response.data.data !== undefined) {
      // 将嵌套的data提取出来，并保留其他字段
      const { data, ...rest } = response.data;
      return {
        ...response,
        data: data,
        // 保留原始响应中的其他字段（如total等）
        ...rest
      };
    }
    return response;
  }

  // 如果response是数组，包装成标准格式
  if (Array.isArray(response)) {
    return { data: response };
  }

  // 如果response是对象但没有data字段，包装成标准格式
  return { data: response };
};

export default {
  handleArrayResponse,
  handlePaginationResponse,
  standardizeResponse
};
