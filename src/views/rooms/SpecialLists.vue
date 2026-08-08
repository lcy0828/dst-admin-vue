<template>
  <div class="special-lists-page">
    <div class="page-header" v-if="!savename">
      <h2>特殊名单管理</h2>
    </div>
    
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="管理员名单" name="admin">
        <el-card shadow="hover" v-loading="loading.admin">
          <div slot="header" class="list-header">
            <span>管理员列表</span>
            <div>
              <el-button size="small" type="primary" @click="addUser('admin')">添加管理员</el-button>
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
            <component is="el-icon-info" class="legacy-icon" />
            <p>暂无管理员</p>
          </div>
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="黑名单" name="block">
        <el-card shadow="hover" v-loading="loading.block">
          <div slot="header" class="list-header">
            <span>黑名单列表</span>
            <div>
              <el-button size="small" type="primary" @click="addUser('block')">添加黑名单</el-button>
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
            <component is="el-icon-info" class="legacy-icon" />
            <p>暂无黑名单用户</p>
          </div>
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="白名单" name="white">
        <el-card shadow="hover" v-loading="loading.white">
          <div slot="header" class="list-header">
            <span>白名单列表</span>
            <div>
              <el-button size="small" type="primary" @click="addUser('white')">添加白名单</el-button>
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
            <component is="el-icon-info" class="legacy-icon" />
            <p>暂无白名单用户</p>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 添加用户对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="30%">
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
  methods: {
    // 关闭对话框
    close() {
      this.$emit('close');
    },
    
    // 获取所有列表数据
    fetchAllLists() {
      if (!this.savename) return;
      
      this.fetchAdminList();
      this.fetchBlockList();
      this.fetchWhiteList();
    },
    
    // 获取管理员列表
    fetchAdminList() {
      this.loading.admin = true;
      
      serverApi.getAdminList(this.savename)
        .then(res => {
          this.adminList = res.data;
          this.adminList = this.adminList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          this.$message.error('获取管理员列表失败: ' + (err.message || '未知错误'));
        })
        .finally(() => {
          this.loading.admin = false;
        });
    },
    
    // 获取黑名单
    fetchBlockList() {
      this.loading.block = true;
      serverApi.getBlockList(this.savename)
        .then(res => {
          this.blockList = res.data;
          this.blockList = this.blockList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          this.$message.error('获取黑名单失败: ' + (err.message || '未知错误'));
        })
        .finally(() => {
          this.loading.block = false;
        });
    },
    
    // 获取白名单
    fetchWhiteList() {
      this.loading.white = true;
      serverApi.getWhiteList(this.savename)
        .then(res => {
          this.whiteList = res.data;
          this.whiteList = this.whiteList.map(item => {
            return this.normalizeUserData(item);
          });
        })
        .catch(err => {
          this.$message.error('获取白名单失败: ' + (err.message || '未知错误'));
        })
        .finally(() => {
          this.loading.white = false;
        });
    },
    
    // 标准化用户数据格式
    normalizeUserData(item) {
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
        if (!this.savename) {
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
          this.emitPendingLists();
          this.$message.info('已从待保存名单移除，创建房间时才会写入服务器');
          return;
        }
        const loading = this.$loading({
          lock: true,
          text: '正在移除...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        });
        let listData;
        // 发送API请求
        let apiPromise;
        
        switch(type) {
          case 'admin':
            listData = this.adminList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateAdminList(this.savename, listData, true);
            break;
          case 'block':
            listData = this.blockList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateBlockList(this.savename, listData, true);
            break;
          case 'white':
            listData = this.whiteList
              .filter((item, idx) => idx !== index)
              .map(item => item.id || item);
            apiPromise = serverApi.updateWhiteList(this.savename, listData, true);
            break;
        }
        apiPromise
          .then(() => {
            loading.close();
            this.$message.success('移除成功');
            this.fetchAllLists();
          })
          .catch(err => {
            loading.close();
            console.error('移除失败:', err);
            this.$message.error('移除失败: ' + (err.message || '未知错误'));
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
        // 准备要添加的用户
        const newUser = this.userForm.id;
        if (!this.savename) {
          switch(this.dialogType) {
            case 'admin':
              this.adminList.push({ id: newUser, name: newUser });
              break;
            case 'block':
              this.blockList.push({ id: newUser, name: newUser });
              break;
            case 'white':
              this.whiteList.push({ id: newUser, name: newUser });
              break;
          }
          this.submitting = false;
          this.dialogVisible = false;
          this.emitPendingLists();
          this.$message.info('已加入待保存名单，创建房间时才会写入服务器');
          return;
        }
        let listData;
        let apiPromise;
        switch(this.dialogType) {
          case 'admin':
              listData = [...this.adminList.map(item => item.id || item), newUser];
              apiPromise = serverApi.updateAdminList(this.savename, listData);
            break;
          case 'block':
            listData = [...this.blockList.map(item => item.id || item), newUser];
            apiPromise = serverApi.updateBlockList(this.savename, listData);
            break;
          case 'white':
            listData = [...this.whiteList.map(item => item.id || item), newUser];
            apiPromise = serverApi.updateWhiteList(this.savename, listData);
            break;
        }        
        // 处理响应
        apiPromise
          .then(() => {
            this.submitting = false;
            this.dialogVisible = false;
            this.$message.success('添加成功');
            
            // 重新获取列表数据
            this.fetchAllLists();
          })
          .catch(err => {
            this.$message.error('添加失败: ' + (err.message || '未知错误'));
            this.submitting = false;
          });
      });
    },
    emitPendingLists() {
      const admin = this.adminList.map(item => item.id);
      const block = this.blockList.map(item => item.id);
      const white = this.whiteList.map(item => item.id);
      this.$emit('add-user', { admin, block, white });
    }
  },
  watch: {
    savename: {
      immediate: true,
      handler(value) {
        if (value) {
          this.$nextTick(() => this.fetchAllLists());
        }
      }
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
  color: #758078;
}

.empty-list i {
  font-size: 40px;
  margin-bottom: 10px;
}

.el-tabs {
  margin-bottom: 20px;
}
</style>
