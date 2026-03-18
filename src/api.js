import axios from 'axios';

const apiClient = axios.create({
    baseURL: "https://ornithologic-overcleverly-mirta.ngrok-free.dev",
    timeout: 120000, // Tăng thời gian chờ lên 2 phút cho chế độ nhiều ảnh
});

export const aiApi = {

    // ==========================================
    // CHẾ ĐỘ 1: XỬ LÝ 1 ẢNH (SINGLE)
    // Nhận vào 1 Object File. Trả về String hoặc Array(5 câu)
    // ==========================================

    async getBeamCaptionSingle(imageFile, lang) {
        const formData = new FormData();
        // Backend mới yêu cầu key là 'files' (số nhiều) dù chỉ gửi 1 ảnh
        formData.append('files', imageFile); 
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_beamsearch', formData);
            
            if (response.data.status === 'completed') {
                const firstResult = response.data.results[0];
                if (firstResult.status === 'success') {
                    return firstResult.caption; // Trả về thẳng câu caption (String)
                }
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
                if (firstResult.status === 'success') {
                    return firstResult.captions; // Trả về mảng 5 câu caption (Array)
                }
                throw new Error(firstResult.message);
            }
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Top-k (1 ảnh): " + error.message);
        }
    },


    // ==========================================
    // CHẾ ĐỘ 2: XỬ LÝ NHIỀU ẢNH (BATCH)
    // Nhận vào 1 mảng File []. Trả về mảng các kết quả
    // ==========================================

    async getBeamCaptionBatch(imageFilesArray, lang) {
        const formData = new FormData();
        // Lặp qua mảng ảnh và gộp tất cả vào cùng một key 'files'
        imageFilesArray.forEach(file => {
            formData.append('files', file);
        });
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_beamsearch', formData);
            if (response.data.status === 'completed') {
                return response.data.results; // Trả về nguyên mảng kết quả của tất cả ảnh
            }
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Beam Search (Nhiều ảnh): " + error.message);
        }
    },

    async getTopKCaptionsBatch(imageFilesArray, lang) {
        const formData = new FormData();
        imageFilesArray.forEach(file => {
            formData.append('files', file);
        });
        formData.append('lang', lang);

        try {
            const response = await apiClient.post('/predict_topk', formData);
            if (response.data.status === 'completed') {
                return response.data.results; // Trả về nguyên mảng kết quả của tất cả ảnh
            }
            throw new Error("Định dạng phản hồi từ server không hợp lệ");
        } catch (error) {
            throw new Error("Lỗi Top-k (Nhiều ảnh): " + error.message);
        }
    }
};