import axios from 'axios';

const apiClient = axios.create({
    baseURL: "https://ornithologic-overcleverly-mirta.ngrok-free.dev",
    timeout: 120000, // Tăng thời gian chờ lên 2 phút cho chế độ nhiều ảnh
});

export const aiApi = {

    // ==========================================
    // CHẾ ĐỘ 1: XỬ LÝ 1 ẢNH (SINGLE)
    // ==========================================

    async getBeamCaptionSingle(imageFile, lang) {
        const formData = new FormData();
        formData.append('files', imageFile); 
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_beamsearch', formData);
            if (response.data.status === 'completed') {
                const firstResult = response.data.results[0];
                if (firstResult.status === 'success') return firstResult.caption;
                throw new Error(firstResult.message);
            }
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Beam Search (1 ảnh): " + error.message);
        }
    },

    async getTopKCaptionsSingle(imageFile, lang) {
        const formData = new FormData();
        formData.append('files', imageFile);
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_topk', formData);
            if (response.data.status === 'completed') {
                const firstResult = response.data.results[0];
                if (firstResult.status === 'success') return firstResult.captions;
                throw new Error(firstResult.message);
            }
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Top-k (1 ảnh): " + error.message);
        }
    },

    // ==========================================
    // CHẾ ĐỘ 2: XỬ LÝ NHIỀU ẢNH (BATCH)
    // ==========================================

    async getBeamCaptionBatch(imageFilesArray, lang) {
        const formData = new FormData();
        imageFilesArray.forEach(file => formData.append('files', file));
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_beamsearch', formData);
            if (response.data.status === 'completed') return response.data.results;
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Beam Search (Nhiều ảnh): " + error.message);
        }
    },

    async getTopKCaptionsBatch(imageFilesArray, lang) {
        const formData = new FormData();
        imageFilesArray.forEach(file => formData.append('files', file));
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_topk', formData);
            if (response.data.status === 'completed') return response.data.results;
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Top-k (Nhiều ảnh): " + error.message);
        }
    },

    // ==========================================
    // API MỚI: XUẤT DATASET COCO DẠNG ZIP
    // ==========================================
    
    async exportCocoBatch(imageFilesArray, langsString, currentResults) {
        const formData = new FormData();
        
        // 1. Nhồi mảng file ảnh vào
        imageFilesArray.forEach(file => formData.append('files', file));
        
        // 2. Nhồi chuỗi ngôn ngữ vào (VD: "vi,en")
        formData.append('langs', langsString);

        // 3. 🌟 GÓI KẾT QUẢ HIỆN TẠI THÀNH JSON 
        const captionsDict = {};
        if (currentResults && currentResults.length > 0) {
            currentResults.forEach(item => {
                // Tạo dictionary với key là tên file
                captionsDict[item.filename] = {
                    // Nếu item.caption_vi là mảng Top-K thì tuyệt vời, nếu là chuỗi đơn thì Backend vẫn tự xử lý được
                    vi: item.caption_vi || [], 
                    en: item.caption_en || []
                };
            });
        }
        
        // Ép sang chuỗi JSON và nhồi vào FormData
        formData.append('captions_data', JSON.stringify(captionsDict));

        try {
            const response = await apiClient.post('/export_coco_dataset', formData, {
                // Rất quan trọng: Báo cho Axios biết đây là file nhị phân
                responseType: 'blob' 
            });
            return response.data; // Trả về Blob để tạo link tải xuống
        } catch (error) {
            throw new Error("Lỗi xuất file COCO từ server: " + error.message);
        }
    }
};