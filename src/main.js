import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)
app.config.performance = false
app.mount('#app')
