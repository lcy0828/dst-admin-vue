<template>
  <div class="server-list-page">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>服务器列表</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshData">刷新</el-button>
      </div>
      
      <div v-loading="loading">
        <el-table
          :data="containerList"
          style="width: 100%"
          border
          stripe>
          <el-table-column
            type="index"
            label="#"
            width="50">
          </el-table-column>
          
          <el-table-column
            prop="names"
            label="容器名称"
            min-width="120">
            <template slot-scope="scope">
              <el-tooltip class="item" effect="dark" :content="scope.row.command" placement="top-start">
                <span>{{ scope.row.names }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          
          <el-table-column
            prop="image"
            label="镜像"
            min-width="120">
          </el-table-column>
          
          <el-table-column
            prop="status"
            label="状态"
            min-width="120">
            <template slot-scope="scope">
              <el-tag :type="scope.row.running ? 'success' : 'danger'" size="medium">
                {{ scope.row.status }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column
            prop="ports"
            label="端口"
            min-width="150">
            <template slot-scope="scope">
              <div v-if="scope.row.ports" class="port-list">
                <div v-for="(port, index) in formatPorts(scope.row.ports)" :key="index" class="port-item">
                  <span :class="{'external-port': port.isExternal}">{{ port.text }}</span>
                </div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          
          <el-table-column
            prop="created"
            label="创建时间"
            min-width="120">
            <template slot-scope="scope">
              {{ formatCreatedTime(scope.row.created) }}
            </template>
          </el-table-column>
          
          <el-table-column
            label="操作"
            width="180">
            <template slot-scope="scope">
              <el-button
                size="mini"
                type="primary"
                :disabled="scope.row.running"
                @click="handleStart(scope.row)">启动</el-button>
              <el-button
                size="mini"
                type="warning"
                :disabled="!scope.row.running"
                @click="handleStop(scope.row)">停止</el-button>
              <el-button
                size="mini"
                type="danger"
                @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="empty-block" v-if="containerList.length === 0 && !loading">
          <span class="empty-text">暂无数据</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { systemApi } from '@/api/index';
import axios from 'axios';

export default {
  name: 'ServerList',
  data() {
    return {
      loading: false,
      containerList: []
    };
  },
  created() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      this.loading = true;
      console.log('开始获取Docker容器列表');
      
      // 使用已修改的API方法
      systemApi.getDockerContainers()
        .then(response => {
          console.log('获取的Docker容器数据:', response);
          
          if (response && response.status === 200 && Array.isArray(response.data)) {
            // 使用正确格式的数据
            this.containerList = response.data;
            console.log('成功获取容器列表:', this.containerList);
          } else {
            this.$message.error(response.msg || '获取容器列表失败');
            console.error('无效的容器数据结构:', response);
          }
        })
        .catch(error => {
          console.error('获取容器列表失败:', error);
          this.$message.error('获取容器列表失败: ' + (error.message || '未知错误'));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    refreshData() {
      this.fetchData();
    },
    formatPorts(portsString) {
      if (!portsString) return [];
      
      // 按逗号分隔端口
      const portItems = portsString.split(',').map(item => item.trim());
      
      return portItems.map(port => {
        // 检查是否包含外部访问端口（格式如 0.0.0.0:8082->8082/tcp）
        const isExternal = port.includes('0.0.0.0:') || port.includes(':::');
        return {
          text: port,
          isExternal
        };
      });
    },
    formatCreatedTime(timeString) {
      if (!timeString) return '';
      
      // 移除时区信息
      const parts = timeString.split(' +');
      if (parts.length > 1) {
        return parts[0];
      }
      
      // 如果没有+号，尝试找CST之前的部分
      const cstParts = timeString.split(' CST');
      if (cstParts.length > 1) {
        return cstParts[0];
      }
      
      return timeString;
    },
    handleStart(row) {
      this.$confirm('确定要启动容器 ' + row.names + ' 吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 调用启动容器API
        this.loading = true;
        systemApi.startDockerContainer(row.container_id)
          .then(response => {
            if (response.status === 200) {
              this.$message({
                type: 'success',
                message: '启动容器成功!'
              });
            } else {
              this.$message.error(response.msg || '启动容器失败');
            }
          })
          .catch(error => {
            console.error('启动容器失败:', error);
            this.$message.error('启动容器失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
            this.fetchData(); // 刷新数据
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消启动'
        });
      });
    },
    handleStop(row) {
      this.$confirm('确定要停止容器 ' + row.names + ' 吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 调用停止容器API
        this.loading = true;
        systemApi.stopDockerContainer(row.container_id)
          .then(response => {
            if (response.status === 200) {
              this.$message({
                type: 'success',
                message: '停止容器成功!'
              });
            } else {
              this.$message.error(response.msg || '停止容器失败');
            }
          })
          .catch(error => {
            console.error('停止容器失败:', error);
            this.$message.error('停止容器失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
            this.fetchData(); // 刷新数据
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消停止'
        });
      });
    },
    handleDelete(row) {
      this.$confirm('删除容器将无法恢复，确定要删除容器 ' + row.names + ' 吗?', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'danger'
      }).then(() => {
        // 调用删除容器API
        this.loading = true;
        systemApi.deleteDockerContainer(row.container_id)
          .then(response => {
            if (response.status === 200) {
              this.$message({
                type: 'success',
                message: '删除容器成功!'
              });
            } else {
              this.$message.error(response.msg || '删除容器失败');
            }
          })
          .catch(error => {
            console.error('删除容器失败:', error);
            this.$message.error('删除容器失败: ' + (error.message || '未知错误'));
          })
          .finally(() => {
            this.loading = false;
            this.fetchData(); // 刷新数据
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    }
  }
};
</script>

<style scoped>
.server-list-page {
  padding: 20px;
}

.box-card {
  margin-bottom: 20px;
}

.empty-block {
  min-height: 60px;
  text-align: center;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-text {
  font-size: 14px;
  color: #909399;
}

.status-tag {
  margin-right: 5px;
}

.port-list {
  display: flex;
  flex-direction: column;
}

.port-item {
  margin-bottom: 3px;
}

.external-port {
  color: #409EFF;
  font-weight: bold;
}
</style> 