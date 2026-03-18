import axios from 'axios';

const apiClient = axios.create({
    baseURL: "https://ornithologic-overcleverly-mirta.ngrok-free.dev",
    timeout: 60000, 
});

export const aiApi = {
    /**
     * Beam Search (1 câu)
     * Thêm tham số 'lang' (vi hoặc en)
     */
    async getBeamCaption(imageFile, lang) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('lang', lang); // Gửi cờ ngôn ngữ lên FastAPI

        try {
            const response = await apiClient.post('/predict_beamsearch', formData);
            if (response.data.status === 'success') {
                return response.data.caption;
            }
            throw new Error(response.data.message);
        } catch (error) {
            throw new Error("Lỗi Beam Search: " + error.message);
        }
    },

    /**
     * Top-k Sampling (5 câu)
     */
    async getTopKCaptions(imageFile, lang) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('lang', lang); // Gửi cờ ngôn ngữ lên FastAPI

        try {
            const response = await apiClient.post('/predict_topk', formData);
            if (response.data.status === 'success') {
                return response.data.captions;
            }
            throw new Error(response.data.message);
        } catch (error) {
            throw new Error("Lỗi Top-k Sampling: " + error.message);
        }
    }
};