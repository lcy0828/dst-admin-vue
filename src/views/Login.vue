<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1>饥荒服务器管理系统</h1>
        <p>{{ setupRequired ? '首次使用，请创建管理员' : "Don't Starve Together 管理后台" }}</p>
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
            @keyup.enter="handleLogin">
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
            {{ setupRequired ? '创建管理员' : '登录' }}
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
import { authAPI } from '@/api/v2'

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
      loading: false,
      setupRequired: false
    }
  },
  mounted() {
    this.loadSession()
  },
  methods: {
    async loadSession() {
      try {
        const session = await authAPI.session()
        this.setupRequired = session.setupRequired === true
      } catch (error) {
        if (this.$route.query.reason === 'backend-unavailable') {
          this.$message.error(error.message)
        }
      }
    },
    async handleLogin() {
      const valid = await this.$refs.loginForm.validate().catch(() => false)
      if (!valid) return

      this.loading = true
      try {
        const action = this.setupRequired ? authAPI.setup : authAPI.login
        await action(this.loginForm.username, this.loginForm.password)
        await this.$router.push('/')
        this.$message.success(this.setupRequired ? '管理员创建成功' : '登录成功')
      } catch (error) {
        this.$message.error(error.message || '登录失败')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: var(--bg-color);
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
  color: var(--text-primary);
  margin-bottom: 10px;
}

.login-header p {
  font-size: 14px;
  color: var(--text-secondary);
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
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: auto;
}

.login-background {
  flex: 1;
  background-color: var(--sidebar-color);
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
