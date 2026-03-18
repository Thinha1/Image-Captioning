<template>
  <div class="app-container">
    <div class="dashboard-layout">

      <div class="left-panel">
        <div 
          class="upload-box-fullscreen" 
          :class="{ 'has-image': imageUrls.length > 0 }" 
          @click="$refs.fileInput.click()"
          @dragover.prevent 
          @drop.prevent="handleDrop"
        >
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden-input" 
            accept="image/*" 
            :multiple="uploadMode === 'batch'" 
            @change="onFileChange" 
          />

          <div v-if="imageUrls.length === 0" class="placeholder">
            <p>Kéo thả ảnh hoặc click để chọn</p>
            <span class="sub-text">Hỗ trợ JPG, PNG, WEBP</span>
            <span v-if="uploadMode === 'batch'" class="sub-text batch-note">(Bạn có thể chọn nhiều ảnh cùng lúc)</span>
          </div>

          <div v-else class="preview-container-fullscreen">
            <img :src="imageUrls[activeIndex]" class="preview-img-fullscreen" />
            <div class="overlay-fullscreen">
              <span>Click hoặc Kéo thả thêm ảnh vào đây</span>
            </div>
          </div>
        </div>

        <div v-if="uploadMode === 'batch' && imageUrls.length > 0" class="thumbnail-gallery">
          <div 
            v-for="(url, index) in imageUrls" 
            :key="index"
            class="thumbnail"
            :class="{ 'active-thumb': activeIndex === index }"
            @click="activeIndex = index"
          >
            <img :src="url" />
            <div v-if="allResults[index] && allResults[index].length > 0" class="status-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="header">
          <h1 class="title">Sports Caption AI</h1>
        </div>

        <div class="content-scrollable">

          <div class="config-section">
            <label>Chế độ Tải lên:</label>
            <div class="mode-tabs">
              <button 
                class="tab-btn" 
                :class="{ active: uploadMode === 'single' }" 
                @click="uploadMode = 'single'"
              >
                1 Ảnh (Single)
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: uploadMode === 'batch' }" 
                @click="uploadMode = 'batch'"
              >
                Nhiều Ảnh (Batch)
              </button>
            </div>
          </div>

          <div class="config-section">
            <label for="search-method">Thuật toán sinh:</label>
            <select id="search-method" v-model="searchMethod" class="dropdown">
              <option value="beam">Beam Search (Câu chuẩn nhất)</option>
              <option value="topk">Top-k Sampling (5 câu đa dạng)</option>
            </select>
          </div>

          <div class="config-section">
            <label>Ngôn ngữ:</label>
            <div class="checkbox-group">
              <label class="checkbox-label" :class="{ active: selectedLangs.includes('vi') }">
                <input type="checkbox" value="vi" v-model="selectedLangs"> Tiếng Việt
              </label>
              <label class="checkbox-label" :class="{ active: selectedLangs.includes('en') }">
                <input type="checkbox" value="en" v-model="selectedLangs"> English
              </label>
            </div>
          </div>

          <button 
            @click="uploadImage" 
            :disabled="filesList.length === 0 || loading || selectedLangs.length === 0"
            class="submit-btn" 
            :class="{ 'loading': loading }"
          >
            <span v-if="loading">Đang phân tích dữ liệu...</span>
            <span v-else>
              {{ uploadMode === 'single' ? 'Sinh chú thích ngay!' : `Sinh chú thích cho ${filesList.length} ảnh!` }}
            </span>
          </button>

          <div v-if="currentResults && currentResults.length > 0" class="result-container">
            <div v-for="res in currentResults" :key="res.lang" class="language-block">
              <div class="result-header">
                <p class="result-label">Kết quả {{ res.lang === 'vi' ? 'Tiếng Việt' : 'English' }}</p>
              </div>

              <div v-if="res.error" class="result-box error-box">
                <p class="error-text">❌ {{ res.error }}</p>
              </div>

              <div v-else-if="searchMethod === 'beam'" class="result-box single">
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
            <p v-if="filesList.length > 0">Nhấn nút bên trên để bắt đầu phân tích</p>
            <p v-else>Kết quả của AI sẽ hiển thị ở đây</p>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { aiApi } from './api' // Kết nối với file api.js mới của bạn

// Trạng thái quản lý Mode
const uploadMode = ref('single') // 'single' hoặc 'batch'

// Dữ liệu ảnh
const filesList = ref([])
const imageUrls = ref([])
const activeIndex = ref(0) // Chỉ số ảnh đang hiển thị

// Trạng thái cấu hình & API
const searchMethod = ref('beam')
const selectedLangs = ref(['vi', 'en'])
const loading = ref(false)

// Mảng 2 chiều lưu kết quả: allResults[index] = [{lang: 'vi', data: ...}, {lang: 'en', data: ...}]
const allResults = ref([])

// Lấy kết quả của ảnh hiện tại để render ra UI
const currentResults = computed(() => {
  return allResults.value[activeIndex.value] || null;
})

// === WATCHERS ===
// Khi đổi mode (1 Ảnh / Nhiều Ảnh), reset sạch sẽ dữ liệu
watch(uploadMode, () => {
  filesList.value = []
  imageUrls.value = []
  allResults.value = []
  activeIndex.value = 0
})

// Khi đổi phương pháp sinh (Beam / TopK), reset kết quả để người dùng nhấn chạy lại
watch(searchMethod, () => {
  allResults.value = new Array(filesList.value.length).fill(null)
})


// === XỬ LÝ FILE ===
const onFileChange = (e) => {
  const files = Array.from(e.target.files)
  if (files.length > 0) prepareFiles(files)
}

const handleDrop = (e) => {
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  if (files.length > 0) prepareFiles(files)
}

const prepareFiles = (newFiles) => {
  if (uploadMode.value === 'single') {
    // Chế độ 1 ảnh: Ghi đè file cũ
    filesList.value = [newFiles[0]]
    imageUrls.value = [URL.createObjectURL(newFiles[0])]
    allResults.value = [null]
    activeIndex.value = 0
  } else {
    // Chế độ nhiều ảnh: Nối thêm vào mảng cũ
    filesList.value = [...filesList.value, ...newFiles]
    imageUrls.value = [...imageUrls.value, ...newFiles.map(f => URL.createObjectURL(f))]
    
    // Khởi tạo mảng kết quả trống tương ứng với số lượng ảnh
    allResults.value = new Array(filesList.value.length).fill(null)
    
    // Tự động nhảy UI sang ảnh vừa mới được thêm vào đầu tiên
    activeIndex.value = filesList.value.length - newFiles.length
  }
}

// === GỌI API ===
const uploadImage = async () => {
  if (filesList.value.length === 0) return
  if (selectedLangs.value.length === 0) {
    alert("Vui lòng chọn ít nhất 1 ngôn ngữ!");
    return;
  }

  loading.value = true

  try {
    if (uploadMode.value === 'single') {
      // --- XỬ LÝ CHẾ ĐỘ 1 ẢNH ---
      const file = filesList.value[0];
      const apiCalls = selectedLangs.value.map(async (lang) => {
        let data = searchMethod.value === 'beam'
          ? await aiApi.getBeamCaptionSingle(file, lang)
          : await aiApi.getTopKCaptionsSingle(file, lang);
        return { lang, data };
      });
      
      const currentRes = await Promise.all(apiCalls);
      allResults.value[0] = currentRes;

    } else {
      // --- XỬ LÝ CHẾ ĐỘ NHIỀU ẢNH (Gửi 1 lần mảng filesList lên Server) ---
      const apiCalls = selectedLangs.value.map(async (lang) => {
        let resultsArray = searchMethod.value === 'beam'
          ? await aiApi.getBeamCaptionBatch(filesList.value, lang)
          : await aiApi.getTopKCaptionsBatch(filesList.value, lang);
        return { lang, resultsArray };
      });

      // resolvedLangs trả về dạng: [ {lang: 'vi', resultsArray: [...]}, {lang: 'en', resultsArray: [...]} ]
      const resolvedLangs = await Promise.all(apiCalls);
      
      // Khởi tạo lại cấu trúc mảng để map ngược vào UI
      const newAllResults = Array.from({ length: filesList.value.length }, () => []);

      resolvedLangs.forEach(langObj => {
        const lang = langObj.lang;
        langObj.resultsArray.forEach((res, index) => {
          if (res.status === 'success') {
            newAllResults[index].push({
              lang: lang,
              data: res.caption || res.captions // Tương thích cả Beam (caption) và TopK (captions)
            });
          } else {
            newAllResults[index].push({
              lang: lang,
              error: res.message
            });
          }
        });
      });

      allResults.value = newAllResults;
    }
  } catch (error) {
    alert(error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Reset cơ bản */
* { box-sizing: border-box; }
.hidden-input { display: none; }

.app-container {
  height: 100vh;
  width: 100vw;
  background-color: #0f172a;
  font-family: 'Inter', system-ui, sans-serif;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.dashboard-layout {
  display: flex;
  height: 100%;
  width: 100%;
}

/* === CỘT TRÁI === */
.left-panel {
  flex: 1;
  width: 400px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px; /* Khoảng cách giữa Preview và Thumbnails */
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

.placeholder p {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: #cbd5e1;
}

.placeholder .sub-text {
  display: block;
  font-size: 13px;
  color: #64748b;
}

.placeholder .batch-note {
  margin-top: 8px;
  color: #3b82f6;
  font-weight: 500;
}

.preview-container-fullscreen {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  position: relative;
}

.preview-img-fullscreen {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.overlay-fullscreen {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 16px;
  font-weight: 600;
  backdrop-filter: blur(2px);
}

.upload-box-fullscreen:hover .overlay-fullscreen {
  opacity: 1;
}

/* THUMBNAIL GALLERY */
.thumbnail-gallery {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px;
  min-height: 80px;
  background: #1e293b;
  border-radius: 12px;
  align-items: center;
}

.thumbnail-gallery::-webkit-scrollbar {
  height: 6px;
}
.thumbnail-gallery::-webkit-scrollbar-track {
  background: #0f172a;
  border-radius: 10px;
}
.thumbnail-gallery::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 10px;
}

.thumbnail {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  opacity: 0.5;
  transition: all 0.2s;
}

.thumbnail:hover {
  opacity: 0.8;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail.active-thumb {
  border-color: #3b82f6;
  opacity: 1;
  transform: scale(1.05);
}

.status-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #10b981;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.status-icon svg {
  width: 12px;
  height: 12px;
}

/* === CỘT PHẢI === */
.right-panel {
  width: 700px;
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
}

.content-scrollable {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.content-scrollable::-webkit-scrollbar { width: 6px; }
.content-scrollable::-webkit-scrollbar-track { background: #f1f1f1; }
.content-scrollable::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.content-scrollable::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.config-section {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.config-section label {
  font-weight: 700;
  font-size: 13px;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* TABS CHẾ ĐỘ */
.mode-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: white;
  color: #2563eb;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.dropdown {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  font-size: 14px;
  font-weight: 500;
  outline: none;
}

.dropdown:focus { border-color: #2563eb; background-color: white; }

.checkbox-group { display: flex; gap: 12px; }

.checkbox-label {
  display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1;
  padding: 12px; border-radius: 10px; border: 1px solid #d1d5db; background-color: #f9fafb;
  cursor: pointer; transition: all 0.2s ease; font-size: 14px; font-weight: 600; user-select: none;
}

.checkbox-label.active { background-color: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }
.checkbox-label input { accent-color: #2563eb; width: 16px; height: 16px; }

.submit-btn {
  width: 100%; margin-top: 10px; padding: 16px; background-color: #2563eb; color: white;
  border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
}
.submit-btn:hover:not(:disabled) { background-color: #1d4ed8; transform: translateY(-2px); }
.submit-btn:disabled { background-color: #9ca3af; box-shadow: none; cursor: not-allowed; }
.submit-btn.loading { animation: pulse 1.5s infinite; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }

/* KẾT QUẢ AI */
.result-container { margin-top: 30px; animation: fadeIn 0.4s ease-out; }
.empty-state { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; font-style: italic; padding: 40px 0; border: 2px dashed #e5e7eb; border-radius: 12px; }

.language-block { margin-bottom: 24px; background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02); }
.result-header { display: flex; align-items: center; background: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; gap: 8px; }
.result-label { font-size: 13px; font-weight: 700; color: #334155; margin: 0; flex: 1; text-transform: uppercase; }

.result-box { padding: 16px; background-color: white; }
.result-box.single { border-left: 4px solid #3b82f6; }
.error-box { background-color: #fef2f2; border-left: 4px solid #ef4444; }
.error-text { color: #b91c1c; margin: 0; font-weight: 500; }

.result-list { display: flex; flex-direction: column; }
.list-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px !important; border-bottom: 1px solid #f1f5f9; margin: 0; }
.list-item:last-child { border-bottom: none; }

.index-tag {
  background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px;
}
.index-tag.en { background: #10b981; }

.result-text { font-size: 16px; color: #1f2937; margin: 0; line-height: 1.6; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Responsive Mobile */
@media (max-width: 900px) {
  .dashboard-layout { flex-direction: column; overflow-y: auto; }
  .left-panel { flex: none; height: 50vh; padding: 16px; }
  .right-panel { width: 100%; min-width: 100%; height: auto; box-shadow: none; border-top: 1px solid #e5e7eb; }
  .app-container { overflow-y: auto; height: auto; min-height: 100vh; }
}
</style>