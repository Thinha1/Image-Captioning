<template>
  <div class="app-container">
    <div class="dashboard-layout">

      <div class="left-panel">
        <div class="upload-box-fullscreen" :class="{ 'has-image': imageUrl }" @click="$refs.fileInput.click()"
          @dragover.prevent @drop.prevent="handleDrop">
          <input type="file" ref="fileInput" class="hidden-input" accept="image/*" @change="onFileChange" />

          <div v-if="!imageUrl" class="placeholder">
            <p>Kéo thả ảnh hoặc click để chọn</p>
            <span class="sub-text">Hỗ trợ JPG, PNG, WEBP</span>
          </div>

          <div v-else class="preview-container-fullscreen">
            <img :src="imageUrl" class="preview-img-fullscreen" />
            <div class="overlay-fullscreen">
              <span>Click hoặc Kéo thả ảnh mới vào đây</span>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="header">
          <h1 class="title">Sports Caption AI</h1>
          <!-- <p class="subtitle">Hệ thống miêu tả ảnh thể thao (Song ngữ)</p> -->
        </div>

        <div class="content-scrollable">

          <div class="config-section">
            <label for="search-method">Chế độ sinh:</label>
            <select id="search-method" v-model="searchMethod" class="dropdown">
              <option value="beam">Beam Search (Câu chuẩn nhất)</option>
              <option value="topk">Top-k Sampling (5 câu đa dạng)</option>
            </select>
          </div>

          <div class="config-section">
            <label>Ngôn ngữ:</label>
            <div class="checkbox-group">
              <label class="checkbox-label" :class="{ active: selectedLangs.includes('vi') }">
                <input type="checkbox" value="vi" v-model="selectedLangs">
                🇻🇳 Tiếng Việt
              </label>
              <label class="checkbox-label" :class="{ active: selectedLangs.includes('en') }">
                <input type="checkbox" value="en" v-model="selectedLangs">
                🇬🇧 English
              </label>
            </div>
          </div>

          <button @click="uploadImage" :disabled="!selectedFile || loading || selectedLangs.length === 0"
            class="submit-btn" :class="{ 'loading': loading }">
            <span v-if="loading">Đang phân tích hình ảnh...</span>
            <span v-else>Sinh chú thích ngay!</span>
          </button>

          <div v-if="results.length > 0" class="result-container">
            <div v-for="res in results" :key="res.lang" class="language-block">
              <div class="result-header">
                <span class="flag-icon">{{ res.lang === 'vi' ? '🇻🇳' : '🇬🇧' }}</span>
                <p class="result-label">
                  Kết quả {{ res.lang === 'vi' ? 'Tiếng Việt' : 'English' }}
                </p>
                <span class="badge">{{ searchMethod.toUpperCase() }}</span>
              </div>

              <div v-if="searchMethod === 'beam'" class="result-box single">
                <p class="result-text">"{{ res.data }}"</p>
              </div>

              <div v-else class="result-list">
                <div v-for="(cap, index) in res.data" :key="index" class="result-box list-item">
                  <span class="index-tag" :class="res.lang">{{ index + 1 }}</span>
                  <p class="result-text">"{{ cap }}"</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!loading" class="empty-state">
            <p>Kết quả của AI sẽ hiển thị ở đây</p>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { aiApi } from './api' // Giữ nguyên kết nối API của bạn

const selectedFile = ref(null)
const imageUrl = ref(null)
const searchMethod = ref('beam')
const selectedLangs = ref(['vi', 'en'])
const results = ref([])
const loading = ref(false)

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) prepareFile(file)
}

const handleDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) prepareFile(file)
}

const prepareFile = (file) => {
  selectedFile.value = file
  imageUrl.value = URL.createObjectURL(file)
  results.value = []
}

const uploadImage = async () => {
  if (!selectedFile.value) return
  if (selectedLangs.value.length === 0) {
    alert("Vui lòng chọn ít nhất 1 ngôn ngữ!");
    return;
  }

  loading.value = true
  results.value = []

  try {
    const apiCalls = selectedLangs.value.map(async (lang) => {
      let data;
      if (searchMethod.value === 'beam') {
        data = await aiApi.getBeamCaption(selectedFile.value, lang);
      } else {
        data = await aiApi.getTopKCaptions(selectedFile.value, lang);
      }
      return { lang, data };
    });

    results.value = await Promise.all(apiCalls);
  } catch (error) {
    alert("Lỗi: " + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Reset cơ bản */
* {
  box-sizing: border-box;
}

.hidden-input {
  display: none;
}

/* Bọc toàn bộ trang, ẩn thanh cuộn của body */
.app-container {
  height: 100vh;
  width: 100vw;
  background-color: #0f172a;
  /* Nền tối cho sang trọng */
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Layout chia 2 cột */
.dashboard-layout {
  display: flex;
  height: 100%;
  width: 100%;
}

/* =======================================
   CỘT TRÁI (ẢNH FULL MÀN HÌNH) 
   ======================================= */
.left-panel {
  flex: 1;
  width: 400px;
  /* Tự động giãn chiếm hết phần còn lại */
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.upload-box-fullscreen {
  flex: 1;
  border: 2px dashed #334155;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: #1e293b;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.upload-box-fullscreen:hover {
  border-color: #3b82f6;
  background-color: #0f172a;
}

.placeholder {
  text-align: center;
  color: #94a3b8;
}

.placeholder .icon {
  font-size: 60px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.placeholder p {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: #cbd5e1;
}

.placeholder .sub-text {
  font-size: 13px;
  color: #64748b;
}

.preview-container-fullscreen {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  /* Nền đen tôn ảnh */
  position: relative;
}

/* Quan trọng: object-fit contain giúp ảnh không bị méo */
.preview-img-fullscreen {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.overlay-fullscreen {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 18px;
  font-weight: 600;
  backdrop-filter: blur(2px);
}

.upload-box-fullscreen:hover .overlay-fullscreen {
  opacity: 1;
}

/* =======================================
   CỘT PHẢI (BẢNG ĐIỀU KHIỂN & KẾT QUẢ)
   ======================================= */
.right-panel {
  width: 700px;
  /* Cố định chiều rộng cột phải */
  min-width: 450px;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.header {
  background-color: #2563eb;
  padding: 30px 24px;
  color: white;
  flex-shrink: 0;
}

.title {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #bfdbfe;
  font-size: 14px;
  margin-top: 6px;
  margin-bottom: 0;
}

.content-scrollable {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  /* Cho phép cuộn nếu kết quả quá dài */
}

/* Custom Scrollbar cho mượt */
.content-scrollable::-webkit-scrollbar {
  width: 6px;
}

.content-scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.content-scrollable::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.content-scrollable::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Dropdown & Checkbox */
/* Dropdown & Checkbox */
.config-section {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  /* Đảm bảo section chiếm trọn bề ngang */
}

.config-section label {
  font-weight: 700;
  font-size: 13px;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown {
  width: 100%;
  /* Bắt buộc thẻ select giãn ra bằng với bề ngang của cột phải */
  padding: 12px;
  /* Tăng padding xíu cho cân đối với nút Submit */
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border 0.2s;
  /* Đảm bảo mũi tên dropdown không bị che khuất */
  box-sizing: border-box;
}

.dropdown:focus {
  border-color: #2563eb;
  background-color: white;
}

.checkbox-group {
  display: flex;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 600;
  user-select: none;
}

.checkbox-label.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #2563eb;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Nút Submit */
.submit-btn {
  width: 100%;
  margin-top: 10px;
  padding: 16px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
}

.submit-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
}

.submit-btn:disabled {
  background-color: #9ca3af;
  box-shadow: none;
  cursor: not-allowed;
}

.submit-btn.loading {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.8;
  }

  100% {
    opacity: 1;
  }
}

/* Kết quả AI */
.result-container {
  margin-top: 30px;
  animation: fadeIn 0.4s ease-out;
}

.empty-state {
  margin-top: 40px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  font-style: italic;
  padding: 40px 0;
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
}

.language-block {
  margin-bottom: 24px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.result-header {
  display: flex;
  align-items: center;
  background: #f8fafc;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.flag-icon {
  font-size: 18px;
}

.result-label {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  margin: 0;
  flex: 1;
  text-transform: uppercase;
}

.badge {
  background: #e2e8f0;
  color: #475569;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.result-box {
  padding: 16px;
  background-color: white;
}

.result-box.single {
  border-left: 4px solid #3b82f6;
}

.result-list {
  display: flex;
  flex-direction: column;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f5f9;
  margin: 0;
}

.list-item:last-child {
  border-bottom: none;
}

.index-tag {
  background: #3b82f6;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 2px;
}

.index-tag.en {
  background: #10b981;
}

.result-text {
  font-size: 16px;
  color: #1f2937;
  margin: 0;
  line-height: 1.6;
}

.footer {
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
  background: white;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive cho màn hình nhỏ (Mobile/Tablet) */
@media (max-width: 900px) {
  .dashboard-layout {
    flex-direction: column;
    overflow-y: auto;
  }

  .left-panel {
    flex: none;
    height: 50vh;
    padding: 16px;
  }

  .right-panel {
    width: 100%;
    min-width: 100%;
    height: auto;
    box-shadow: none;
    border-top: 1px solid #e5e7eb;
  }

  .app-container {
    overflow-y: auto;
    height: auto;
    min-height: 100vh;
  }
}
</style>