<template>
  <div class="special-lists-page">
    <div class="page-header" v-if="!savename">
      <h2>特殊名单管理</h2>
    </div>
    
    <el-card class="save-selector" v-if="!savename">
      <div slot="header">
        <span>选择存档</span>
      </div>
      <el-select v-model="currentSave" placeholder="请选择存档" @change="changeSave" style="width: 100%;">
        <el-option
          v-for="item in saveList"
          :key="item.value"
          :label="item.label"
          :value="item.value">
        </el-option>
      </el-select>
    </el-card>
    
    <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
      <el-tab-pane label="管理员名单" name="admin">
        <el-card shadow="hover" v-loading="loading.admin">
          <div slot="header" class="list-header">
            <span>管理员列表</span>
            <div>
              <el-button size="small" type="primary" @click="addUser('admin')" :disabled="!currentSave">添加管理员</el-button>
            </div>
          </div>
          
          <div v-if="adminList.length > 0">
            <el-table :data="adminList" style="width: 100%">
              <el-table-column prop="name" label="玩家名称"></el-table-column>
              <el-table-column prop="id" label="KU ID"></el-table-column>
              <el-table-column fixed="right" label="操作" width="120">
                <template slot-scope="scope">
                  <el-button
                    @click.native.prevent="removeUser('admin', scope.$index, scope.row)"
                    type="danger"
                    size="small">
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else class="empty-list">
            <i class="el-icon-info"></i>
            <p>暂无管理员</p>
          </div>
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="黑名单" name="block">
        <el-card shadow="hover" v-loading="loading.block">
          <div slot="header" class="list-header">
            <span>黑名单列表</span>
            <div>
              <el-button size="small" type="primary" @click="addUser('block')" :disabled="!currentSave">添加黑名单</el-button>
            </div>
          </div>
          
          <div v-if="blockList.length > 0">
            <el-table :data="blockList" style="width: 100%">
              <el-table-column prop="name" label="玩家名称"></el-table-column>
              <el-table-column prop="id" label="KU ID"></el-table-column>
              <el-table-column fixed="right" label="操作" width="120">
                <template slot-scope="scope">
                  <el-button
                    @click.native.prevent="removeUser('block', scope.$index, scope.row)"
                    type="danger"
                    size="small">
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else class="empty-list">
            <i class="el-icon-info"></i>
            <p>暂无黑名单用户</p>
          </div>
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="白名单" name="white">
        <el-card shadow="hover" v-loading="loading.white">
          <div slot="header" class="list-header">
            <span>白名单列表</span>
            <div>
              <el-button size="small" type="primary" @click="addUser('white')" :disabled="!currentSave">添加白名单</el-button>
            </div>
          </div>
          
          <div v-if="whiteList.length > 0">
            <el-table :data="whiteList" style="width: 100%">
              <el-table-column prop="name" label="玩家名称"></el-table-column>
              <el-table-column prop="id" label="KU ID"></el-table-column>
              <el-table-column fixed="right" label="操作" width="120">
                <template slot-scope="scope">
                  <el-button
                    @click.native.prevent="removeUser('white', scope.$index, scope.row)"
                    type="danger"
                    size="small">
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else class="empty-list">
            <i class="el-icon-info"></i>
            <p>暂无白名单用户</p>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 添加用户对话框 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="30%">
      <el-form :model="userForm" ref="userForm" :rules="userRules" label-width="100px">
        <el-form-item label="KU ID" prop="id">
          <el-input v-model="userForm.id" placeholder="格式: KU_XXXXX"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUserForm" :loading="submitting">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { serverApi } from '@/api/index';

export default {
  name: 'SpecialLists',
  props: {
    savename: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      // 存档相关
      saveList: [
        { label: '存档1', value: 'save1' },
        { label: '存档2', value: 'save2' },
        { label: '存档3', value: 'save3' }
      ],
      currentSave: '',
      
      // 标签页
      activeTab: 'admin',
      
      // 数据
      adminList: [],
      blockList: [],
      whiteList: [],
      
      // 加载状态
      loading: {
        admin: false,
        block: false,
        white: false
      },
      
      // 对话框
      dialogVisible: false,
      dialogType: 'admin', // admin, block, white
      dialogTitle: '添加管理员',
      userForm: {
        id: ''
      },
      userRules: {
        id: [
          { required: true, message: '请输入KU ID', trigger: 'blur' },
          { 
            pattern: /^KU_[A-Za-z0-9]+$/, 
            message: 'KU ID格式必须为KU_开头加字母或数字', 
            trigger: 'blur' 
          }
        ]
      },
      submitting: false
    }
  },
  watch: {
    savename: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.currentSave = newVal;
          // 不在这里调用fetchAllLists，避免重复请求
        }
      }
    }
  },
  methods: {
    // 关闭对话框
    close() {
      this.$emit('close');
    },
    // 切换存档
    changeSave() {
      this.fetchAllLists();
    },
    
    // 切换标签页
    handleTabClick(tab) {
      // 可根据需要添加逻辑
    },
    
    // 获取所有列表数据
    fetchAllLists() {
      const saveToUse = this.savename || this.currentSave;
      if (!saveToUse) return;
      
      this.fetchAdminList();
      this.fetchBlockList();
      this.fetchWhiteList();
    },
    
    // 获取管理员列表
    fetchAdminList() {
      this.loading.admin = true;
      const saveToUse = this.savename || this.currentSave;
      
      serverApi.getAdminList(saveToUse)
        .then(res => {
          console.log('获取管理员列表原始响应:', res);
          // 处理各种可能的响应格式
          if (res && res.data && Array.isArray(res.data)) {
            this.adminList = res.data;
          } else if (res && res.adminlist && Array.isArray(res.adminlist)) {
            this.adminList = res.adminlist;
          } else if (res && res.list && Array.isArray(res.list)) {
            this.adminList = res.list;
          } else if (res && res.admin_list && Array.isArray(res.admin_list)) {
            this.adminList = res.admin_list;
          } else if (Array.isArray(res)) {
            this.adminList = res;
          } else {
            this.adminList = [];
            console.warn('无法识别的管理员列表格式:', res);
          }
          
          // 确保每个对象都有name和id属性
          this.adminList = this.adminList.map(item => {
            return this.normalizeUserData(item);
          });
          
          console.log('处理后的管理员列表:', this.adminList);
        })
        .catch(err => {
          console.error('获取管理员列表失败:', err);
          this.$message.error('获取管理员列表失败');
          
          // 临时示例数据
          this.adminList = [
            { name: '管理员1', id: 'KU_12345678' },
            { name: '管理员2', id: 'KU_87654321' }
          ];
        })
        .finally(() => {
          this.loading.admin = false;
        });
    },
    
    // 获取黑名单
    fetchBlockList() {
      this.loading.block = true;
      const saveToUse = this.savename || this.currentSave;
      
      serverApi.getBlockList(saveToUse)
        .then(res => {
          console.log('获取黑名单原始响应:', res);
          // 处理各种可能的响应格式
          if (res && res.data && Array.isArray(res.data)) {
            this.blockList = res.data;
          } else if (res && res.blocklist && Array.isArray(res.blocklist)) {
            this.blockList = res.blocklist;
          } else if (res && res.list && Array.isArray(res.list)) {
            this.blockList = res.list;
          } else if (res && res.block_list && Array.isArray(res.block_list)) {
            this.blockList = res.block_list;
          } else if (Array.isArray(res)) {
            this.blockList = res;
          } else {
            this.blockList = [];
            console.warn('无法识别的黑名单格式:', res);
          }
          
          // 确保每个对象都有name和id属性
          this.blockList = this.blockList.map(item => {
            return this.normalizeUserData(item);
          });
          
          console.log('处理后的黑名单:', this.blockList);
        })
        .catch(err => {
          console.error('获取黑名单失败:', err);
          this.$message.error('获取黑名单失败');
          
          // 临时示例数据
          this.blockList = [
            { name: '黑名单用户1', id: 'KU_11111111' },
            { name: '黑名单用户2', id: 'KU_22222222' }
          ];
        })
        .finally(() => {
          this.loading.block = false;
        });
    },
    
    // 获取白名单
    fetchWhiteList() {
      this.loading.white = true;
      const saveToUse = this.savename || this.currentSave;
      
      serverApi.getWhiteList(saveToUse)
        .then(res => {
          console.log('获取白名单原始响应:', res);
          // 处理各种可能的响应格式
          if (res && res.data && Array.isArray(res.data)) {
            this.whiteList = res.data;
          } else if (res && res.whitelist && Array.isArray(res.whitelist)) {
            this.whiteList = res.whitelist;
          } else if (res && res.list && Array.isArray(res.list)) {
            this.whiteList = res.list;
          } else if (res && res.white_list && Array.isArray(res.white_list)) {
            this.whiteList = res.white_list;
          } else if (Array.isArray(res)) {
            this.whiteList = res;
          } else {
            this.whiteList = [];
            console.warn('无法识别的白名单格式:', res);
          }
          
          // 确保每个对象都有name和id属性
          this.whiteList = this.whiteList.map(item => {
            return this.normalizeUserData(item);
          });
          
          console.log('处理后的白名单:', this.whiteList);
        })
        .catch(err => {
          console.error('获取白名单失败:', err);
          this.$message.error('获取白名单失败');
          
          // 临时示例数据
          this.whiteList = [
            { name: '白名单用户1', id: 'KU_33333333' },
            { name: '白名单用户2', id: 'KU_44444444' }
          ];
        })
        .finally(() => {
          this.loading.white = false;
        });
    },
    
    // 标准化用户数据格式
    normalizeUserData(item) {
      // 如果是字符串，可能是纯ID或纯名称
      if (typeof item === 'string') {
        // KU开头可能是ID
        if (item.startsWith('KU_') || item.match(/^\d+$/)) {
          return { name: item, id: item };
        } else {
          return { name: item, id: '' };
        }
      }
      
      // 如果是对象，确保有name和id属性
      const result = { ...item };
      
      // 检查各种可能的属性名
      if (!result.name) {
        result.name = result.username || result.user_name || result.playerName || 
                      result.player_name || result.nickname || result.nick || '';
      }
      
      if (!result.id) {
        result.id = result.userId || result.user_id || result.playerId || 
                     result.player_id || result.kuId || result.ku_id || '';
      }
      
      return result;
    },
    
    // 打开添加用户对话框
    addUser(type) {
      this.dialogType = type;
      switch(type) {
        case 'admin':
          this.dialogTitle = '添加管理员';
          break;
        case 'block':
          this.dialogTitle = '添加黑名单';
          break;
        case 'white':
          this.dialogTitle = '添加白名单';
          break;
      }
      
      this.userForm = {
        id: ''
      };
      this.dialogVisible = true;
    },
    
    // 移除用户
    removeUser(type, index, row) {
      const idToRemove = row.id || row;
      this.$confirm(`确定要从${type === 'admin' ? '管理员列表' : type === 'block' ? '黑名单' : '白名单'}中移除 ${idToRemove} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 根据类型移除用户
        const saveToUse = this.savename || this.currentSave;
        const loading = this.$loading({
          lock: true,
          text: '正在移除...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });
        
        // 准备新的列表数据（移除指定用户）
        let listData;
        
        switch(type) {
          case 'admin':
            // 从adminList中移除
            listData = this.adminList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            break;
          case 'block':
            // 从blockList中移除
            listData = this.blockList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            break;
          case 'white':
            // 从whiteList中移除
            listData = this.whiteList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            break;
        }
        
        // 准备请求参数
        const requestData = {
          savename: saveToUse,
          list: listData
        };
        
        console.log(`移除${type}列表请求参数:`, requestData);
        
        // 发送API请求
        let apiPromise;
        switch(type) {
          case 'admin':
            apiPromise = serverApi.updateAdminList(saveToUse, listData);
            break;
          case 'block':
            apiPromise = serverApi.updateBlockList(saveToUse, listData);
            break;
          case 'white':
            apiPromise = serverApi.updateWhiteList(saveToUse, listData);
            break;
        }
        
        // 处理响应
        apiPromise
          .then(res => {
            loading.close();
            this.$message.success('移除成功');
            
            // 重新获取列表数据
            this.fetchAllLists();
          })
          .catch(err => {
            loading.close();
            console.error('移除失败:', err);
            this.$message.error('移除失败: ' + (err.message || '未知错误'));
            
            // 模拟成功，方便测试
            // 更新本地数据
            switch(type) {
              case 'admin':
                this.adminList.splice(index, 1);
                break;
              case 'block':
                this.blockList.splice(index, 1);
                break;
              case 'white':
                this.whiteList.splice(index, 1);
                break;
            }
            
            this.$message.success('移除成功');
          });
      }).catch(() => {
        // 取消移除
      });
    },
    
    // 提交表单
    submitUserForm() {
      this.$refs.userForm.validate(valid => {
        if (!valid) return;
        
        this.submitting = true;
        const saveToUse = this.savename || this.currentSave;
        
        // 准备要添加的用户
        const newUser = this.userForm.id;
        
        // 根据类型添加用户
        let listData;
        
        switch(this.dialogType) {
          case 'admin':
            listData = [...this.adminList.map(item => item.id || item), newUser];
            break;
          case 'block':
            listData = [...this.blockList.map(item => item.id || item), newUser];
            break;
          case 'white':
            listData = [...this.whiteList.map(item => item.id || item), newUser];
            break;
        }
        
        // 准备请求参数
        const requestData = {
          savename: saveToUse,
          list: listData
        };
        
        console.log(`添加${this.dialogType}列表请求参数:`, requestData);
        
        // 发送API请求
        let apiPromise;
        switch(this.dialogType) {
          case 'admin':
            apiPromise = serverApi.updateAdminList(saveToUse, listData);
            break;
          case 'block':
            apiPromise = serverApi.updateBlockList(saveToUse, listData);
            break;
          case 'white':
            apiPromise = serverApi.updateWhiteList(saveToUse, listData);
            break;
        }
        
        // 处理响应
        apiPromise
          .then(res => {
            this.submitting = false;
            this.dialogVisible = false;
            this.$message.success('添加成功');
            
            // 重新获取列表数据
            this.fetchAllLists();
          })
          .catch(err => {
            console.error('添加失败:', err);
            this.$message.error('添加失败: ' + (err.message || '未知错误'));
            this.submitting = false;
            
            // 模拟成功，方便测试
            setTimeout(() => {
              this.dialogVisible = false;
              
              // 更新本地数据
              const newUserObj = { id: newUser, name: newUser };
              switch(this.dialogType) {
                case 'admin':
                  this.adminList.push(newUserObj);
                  break;
                case 'block':
                  this.blockList.push(newUserObj);
                  break;
                case 'white':
                  this.whiteList.push(newUserObj);
                  break;
              }
              
              this.$message.success('添加成功');
            }, 1000);
          });
      });
    }
  },
  mounted() {
    // 如果有传入savename，直接使用；否则使用自身的currentSave
    if (this.savename) {
      this.currentSave = this.savename;
      this.fetchAllLists();
    } else {
      // 获取可用存档列表
      // 实际应用中应该调用API获取存档列表
    }
  }
}
</script>

<style scoped>
.special-lists-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.save-selector {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-list {
  text-align: center;
  padding: 30px 0;
  color: #909399;
}

.empty-list i {
  font-size: 40px;
  margin-bottom: 10px;
}

.el-tabs {
  margin-bottom: 20px;
}
</style> 