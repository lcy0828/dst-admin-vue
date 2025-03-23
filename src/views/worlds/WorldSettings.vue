<template>
  <div class="world-settings-page">
    <div class="page-header">
      <h2>{{ isEdit ? '编辑世界' : '创建世界' }}</h2>
      <div class="header-actions">
        <el-button @click="goBack">返回列表</el-button>
        <el-button type="primary" @click="saveSettings" :loading="loading">保存设置</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="settings-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本设置" name="basic">
          <el-form ref="basicForm" :model="worldForm" :rules="rules" label-width="120px">
            <el-form-item label="世界名称" prop="name">
              <el-input v-model="worldForm.name" placeholder="请输入世界名称"></el-input>
            </el-form-item>
            
            <el-form-item label="世界类型" prop="type">
              <el-radio-group v-model="worldForm.type">
                <el-radio label="master">主世界</el-radio>
                <el-radio label="cave">洞穴</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item label="游戏模式" prop="gameMode">
              <el-select v-model="worldForm.gameMode" placeholder="请选择游戏模式">
                <el-option label="生存模式" value="survival"></el-option>
                <el-option label="荒野模式" value="wilderness"></el-option>
                <el-option label="无尽模式" value="endless"></el-option>
                <el-option label="自定义模式" value="custom"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="描述">
              <el-input type="textarea" v-model="worldForm.description" rows="3" placeholder="请输入世界描述"></el-input>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="世界生成" name="generation">
          <el-form ref="genForm" :model="worldForm.generation" label-width="120px">
            <el-form-item label="世界大小">
              <el-select v-model="worldForm.generation.size" placeholder="请选择世界大小">
                <el-option label="小" value="small"></el-option>
                <el-option label="默认" value="default"></el-option>
                <el-option label="大" value="large"></el-option>
                <el-option label="巨大" value="huge"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="分支数量">
              <el-slider v-model="worldForm.generation.branches" :min="1" :max="10" show-stops></el-slider>
            </el-form-item>
            
            <el-form-item label="循环">
              <el-switch v-model="worldForm.generation.loop"></el-switch>
            </el-form-item>
            
            <el-divider>资源设置</el-divider>
            
            <el-form-item label="资源丰富度">
              <el-select v-model="worldForm.generation.resources" placeholder="请选择资源丰富度">
                <el-option label="很少" value="few"></el-option>
                <el-option label="默认" value="default"></el-option>
                <el-option label="较多" value="many"></el-option>
                <el-option label="大量" value="plenty"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="特殊资源">
              <el-checkbox-group v-model="worldForm.generation.specialResources">
                <el-checkbox label="猪村">猪村</el-checkbox>
                <el-checkbox label="芦苇">芦苇</el-checkbox>
                <el-checkbox label="洞穴虫洞">洞穴虫洞</el-checkbox>
                <el-checkbox label="蘑菇林">蘑菇林</el-checkbox>
                <el-checkbox label="沼泽">沼泽</el-checkbox>
                <el-checkbox label="蜂后">蜂后</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="高级设置" name="advanced">
          <el-form ref="advancedForm" :model="worldForm.advanced" label-width="150px">
            <el-form-item label="初始季节">
              <el-select v-model="worldForm.advanced.startSeason" placeholder="请选择初始季节">
                <el-option label="秋" value="autumn"></el-option>
                <el-option label="冬" value="winter"></el-option>
                <el-option label="春" value="spring"></el-option>
                <el-option label="夏" value="summer"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="季节长度">
              <el-input-number v-model="worldForm.advanced.seasonLength" :min="1" :max="100"></el-input-number>
              <span class="input-help">天</span>
            </el-form-item>
            
            <el-form-item label="昼夜长度">
              <el-select v-model="worldForm.advanced.dayLength" placeholder="请选择昼夜长度">
                <el-option label="短" value="short"></el-option>
                <el-option label="默认" value="default"></el-option>
                <el-option label="长" value="long"></el-option>
                <el-option label="永昼" value="always_day"></el-option>
                <el-option label="永夜" value="always_night"></el-option>
              </el-select>
            </el-form-item>
            
            <el-divider>难度设置</el-divider>
            
            <el-form-item label="生物攻击性">
              <el-select v-model="worldForm.advanced.creatureAggression" placeholder="请选择生物攻击性">
                <el-option label="无" value="none"></el-option>
                <el-option label="默认" value="default"></el-option>
                <el-option label="高" value="high"></el-option>
                <el-option label="疯狂" value="insane"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="怪物数量">
              <el-select v-model="worldForm.advanced.monsterCount" placeholder="请选择怪物数量">
                <el-option label="无" value="none"></el-option>
                <el-option label="少" value="less"></el-option>
                <el-option label="默认" value="default"></el-option>
                <el-option label="多" value="more"></el-option>
                <el-option label="大量" value="lots"></el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'WorldSettings',
  data() {
    return {
      loading: false,
      activeTab: 'basic',
      isEdit: false,
      worldId: null,
      worldForm: {
        name: '',
        type: 'master',
        gameMode: 'survival',
        description: '',
        generation: {
          size: 'default',
          branches: 5,
          loop: false,
          resources: 'default',
          specialResources: []
        },
        advanced: {
          startSeason: 'autumn',
          seasonLength: 20,
          dayLength: 'default',
          creatureAggression: 'default',
          monsterCount: 'default'
        }
      },
      rules: {
        name: [
          { required: true, message: '请输入世界名称', trigger: 'blur' },
          { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择世界类型', trigger: 'change' }
        ],
        gameMode: [
          { required: true, message: '请选择游戏模式', trigger: 'change' }
        ]
      }
    }
  },
  methods: {
    goBack() {
      this.$router.push('/worlds/list');
    },
    saveSettings() {
      this.$refs.basicForm.validate(valid => {
        if (valid) {
          this.loading = true;
          
          // 模拟API调用
          setTimeout(() => {
            this.loading = false;
            this.$message({
              message: this.isEdit ? '世界设置已更新' : '世界创建成功',
              type: 'success'
            });
            this.goBack();
          }, 1000);
        } else {
          this.$message.error('请正确填写表单信息');
          return false;
        }
      });
    },
    loadWorldData() {
      if (!this.worldId) return;
      
      this.loading = true;
      
      // 模拟API调用，获取世界详情
      setTimeout(() => {
        // 假设这是从API获取的数据
        const worldData = this.worlds.find(w => w.id === this.worldId);
        
        if (worldData) {
          this.worldForm = {
            name: worldData.name,
            type: worldData.type,
            gameMode: 'survival',
            description: worldData.description,
            generation: {
              size: 'default',
              branches: 5,
              loop: false,
              resources: 'default',
              specialResources: []
            },
            advanced: {
              startSeason: worldData.season === '秋季' ? 'autumn' : 'spring',
              seasonLength: 20,
              dayLength: 'default',
              creatureAggression: 'default',
              monsterCount: 'default'
            }
          };
        } else {
          this.$message.error('未找到世界信息');
          this.goBack();
        }
        
        this.loading = false;
      }, 1000);
    }
  },
  created() {
    // 模拟世界数据库
    this.worlds = [
      {
        id: 1,
        name: '生存世界',
        type: 'master',
        season: '秋季',
        day: 21,
        status: 'running',
        description: '基础生存世界'
      },
      {
        id: 2,
        name: '生存洞穴',
        type: 'cave',
        season: '秋季',
        day: 21,
        status: 'running',
        description: '与生存世界关联的洞穴'
      },
      {
        id: 3,
        name: '无尽模式',
        type: 'master',
        season: '春季',
        day: 12,
        status: 'stopped',
        description: '无尽模式世界'
      }
    ];
    
    // 判断是否为编辑模式
    const { id } = this.$route.query;
    if (id) {
      this.isEdit = true;
      this.worldId = parseInt(id);
      this.loadWorldData();
    }
  }
}
</script>

<style scoped>
.world-settings-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.settings-card {
  margin-bottom: 20px;
}

.input-help {
  margin-left: 10px;
  color: #909399;
}

.el-divider {
  margin: 20px 0;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
}

.el-checkbox {
  margin-right: 30px;
  margin-bottom: 15px;
}
</style> 