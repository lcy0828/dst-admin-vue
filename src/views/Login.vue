<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1>饥荒服务器管理系统</h1>
        <p>Don't Starve Together 管理后台</p>
      </div>
      
      <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form">
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            prefix-icon="el-icon-user" 
            placeholder="用户名">
          </el-input>
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            prefix-icon="el-icon-lock" 
            type="password" 
            placeholder="密码"
            @keyup.enter.native="handleLogin">
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          <el-link type="primary" class="forgot-password" :underline="false">忘记密码?</el-link>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            class="login-button" 
            :loading="loading" 
            @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>© 2023 饥荒管理系统 - Don't Starve Together Admin</p>
      </div>
    </div>
    
    <div class="login-background">
      <div class="login-illustration"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: '',
        remember: false
      },
      loginRules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不少于6位', trigger: 'blur' }
        ]
      },
      loading: false
    }
  },
  methods: {
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loading = true
          
          // 模拟登录请求
          setTimeout(() => {
            this.loading = false
            
            // 保存登录状态
            localStorage.setItem('isLoggedIn', 'true')
            
            // 登录成功，跳转到首页
            this.$router.push('/')
            
            this.$message({
              type: 'success',
              message: '登录成功'
            })
          }, 1500)
        } else {
          return false
        }
      })
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: #f0f2f5;
}

.login-form-wrapper {
  width: 400px;
  padding: 60px 40px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 10px;
}

.login-header p {
  font-size: 14px;
  color: #999;
}

.login-form {
  margin-bottom: 40px;
}

.login-button {
  width: 100%;
  border-radius: 4px;
}

.forgot-password {
  float: right;
}

.login-footer {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-top: auto;
}

.login-background {
  flex: 1;
  background-color: #304156;
  position: relative;
  overflow: hidden;
}

.login-illustration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('https://cdn2.steamgriddb.com/file/sgdb-cdn/grid/76a4d2de4b17729ad86b2d4580a33059.png');
  background-size: cover;
  background-position: center;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .login-container {
    flex-direction: column-reverse;
  }
  
  .login-form-wrapper {
    width: 100%;
    padding: 40px 20px;
  }
  
  .login-background {
    height: 180px;
  }
}
</style> 