import axios from 'axios';

const apiClient = axios.create({
    baseURL: "https://ornithologic-overcleverly-mirta.ngrok-free.dev ",
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

        const captionsDict = {};
        
        if (currentResults && currentResults.length > 0) {
            
            // 🌟 KIỂM TRA NHANH: Xem currentResults có phải chứa trực tiếp lang và data không?
            const isDirectLangArray = currentResults[0].hasOwnProperty('lang') && currentResults[0].hasOwnProperty('data');

            imageFilesArray.forEach((file, index) => {
                const correctFileName = file.name;
                const fileLangs = { vi: [], en: [] };
                
                let targetArray = null;

                if (isDirectLangArray) {
                    // Nếu là mảng trực tiếp (Trường hợp của bạn hiện tại)
                    targetArray = currentResults;
                } else {
                    // Nếu là mảng chứa nhiều ảnh
                    const item = currentResults[index]; 
                    if (item) {
                        const findDataArray = (obj) => {
                            if (Array.isArray(obj) && obj.length > 0 && obj[0].hasOwnProperty('lang') && obj[0].hasOwnProperty('data')) {
                                return obj;
                            }
                            if (typeof obj === 'object' && obj !== null) {
                                for (let k in obj) {
                                    let res = findDataArray(obj[k]);
                                    if (res) return res;
                                }
                            }
                            return null;
                        };
                        targetArray = findDataArray(item);
                    }
                }

                // Trích xuất 5 câu text bỏ vào dictionary
                if (targetArray) {
                    targetArray.forEach(langObj => {
                        if (langObj.lang === 'vi') fileLangs.vi = langObj.data || [];
                        if (langObj.lang === 'en') fileLangs.en = langObj.data || [];
                    });
                }

                captionsDict[correctFileName] = fileLangs;
            });
        }

        console.log("🔥 Dữ liệu JSON CUỐI CÙNG gửi lên Backend:", captionsDict);
        
        // 4. Ép sang chuỗi JSON và nhồi vào FormData
        formData.append('captions_data', JSON.stringify(captionsDict));

        try {
            const response = await apiClient.post('/export_coco_dataset', formData, {
                responseType: 'blob' // Ép nhận file ZIP
            });
            return response.data; 
        } catch (error) {
            throw new Error("Lỗi xuất file COCO từ server: " + error.message);
        }
    }
};