/**
 * 加密工具类
 * 使用Web Crypto API实现AES-GCM加密/解密
 * 负责本地存储数据的安全加密与解密
 */
export class Crypto {
    constructor() {
        this.keyName = 'contact-manager-key';
        this.ivLength = 12; // AES-GCM推荐的IV长度
        this.keyUsages = ['encrypt', 'decrypt'];
    }

    /**
     * 检查浏览器是否支持Web Crypto API
     * @returns {boolean} 是否支持
     */
    isSupported() {
        return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
    }

    /**
     * 从IndexedDB或localStorage获取加密密钥
     * @returns {Promise<CryptoKey|null>} 加密密钥或null
     */
    async getKey() {
        if (!this.isSupported()) {
            console.warn('Web Crypto API not supported, using plain text storage');
            return null;
        }

        try {
            // 尝试从localStorage获取密钥（以JSON形式存储）
            const storedKey = localStorage.getItem(this.keyName);
            if (storedKey) {
                const keyData = JSON.parse(storedKey);
                return await crypto.subtle.importKey(
                    'jwk',
                    keyData,
                    { name: 'AES-GCM' },
                    true,
                    this.keyUsages
                );
            }

            // 如果没有密钥，生成新密钥
            const newKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                this.keyUsages
            );

            // 导出密钥并存储到localStorage
            const exportedKey = await crypto.subtle.exportKey('jwk', newKey);
            localStorage.setItem(this.keyName, JSON.stringify(exportedKey));

            return newKey;
        } catch (error) {
            console.error('Failed to get encryption key:', error);
            return null;
        }
    }

    /**
     * 生成随机初始化向量(IV)
     * @returns {Uint8Array} 随机IV
     */
    generateIV() {
        return crypto.getRandomValues(new Uint8Array(this.ivLength));
    }

    /**
     * 将ArrayBuffer转换为Base64字符串
     * @param {ArrayBuffer} buffer ArrayBuffer对象
     * @returns {string} Base64字符串
     */
    arrayBufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    /**
     * 将Base64字符串转换为ArrayBuffer
     * @param {string} base64 Base64字符串
     * @returns {ArrayBuffer} ArrayBuffer对象
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 加密数据
     * @param {string} data 要加密的数据
     * @returns {Promise<string|null>} 加密后的数据（Base64格式）或null
     */
    async encrypt(data) {
        const key = await this.getKey();
        if (!key) {
            return data; // 不支持加密时返回原始数据
        }

        try {
            // 生成IV
            const iv = this.generateIV();
            
            // 加密数据
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                new TextEncoder().encode(data)
            );

            // 组合IV和加密数据（IV + encrypted）
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // 转换为Base64字符串
            return this.arrayBufferToBase64(combined.buffer);
        } catch (error) {
            console.error('Encryption failed:', error);
            return data; // 加密失败时返回原始数据
        }
    }

    /**
     * 解密数据
     * @param {string} encryptedData 加密的数据（Base64格式）
     * @returns {Promise<string|null>} 解密后的数据或null
     */
    async decrypt(encryptedData) {
        const key = await this.getKey();
        if (!key) {
            return encryptedData; // 不支持解密时返回原始数据
        }

        try {
            // 将Base64转换为ArrayBuffer
            const combinedBuffer = this.base64ToArrayBuffer(encryptedData);
            const combined = new Uint8Array(combinedBuffer);

            // 分离IV和加密数据
            const iv = combined.slice(0, this.ivLength);
            const encrypted = combined.slice(this.ivLength);

            // 解密数据
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            // 转换为字符串
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedData; // 解密失败时返回原始数据
        }
    }

    /**
     * 加密并存储数据到localStorage
     * @param {string} key 存储键名
     * @param {any} data 要存储的数据
     * @returns {Promise<boolean>} 是否成功
     */
    async encryptAndStore(key, data) {
        try {
            // 序列化数据
            const jsonData = JSON.stringify(data);
            // 加密数据
            const encrypted = await this.encrypt(jsonData);
            // 存储到localStorage
            localStorage.setItem(key, encrypted);
            return true;
        } catch (error) {
            console.error('Failed to encrypt and store data:', error);
            return false;
        }
    }

    /**
     * 从localStorage读取并解密数据
     * @param {string} key 存储键名
     * @returns {Promise<any|null>} 解密后的数据或null
     */
    async readAndDecrypt(key) {
        try {
            // 从localStorage读取数据
            const encryptedData = localStorage.getItem(key);
            if (!encryptedData) {
                return null;
            }

            // 解密数据
            const decrypted = await this.decrypt(encryptedData);
            // 反序列化数据
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Failed to read and decrypt data:', error);
            return null;
        }
    }
}