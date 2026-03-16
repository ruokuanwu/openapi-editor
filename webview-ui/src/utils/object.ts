import type { ComputedRef } from 'vue';

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    // 复制原对象，避免修改原数据
    const result = { ...obj };

    // 遍历删除指定属性
    keys.forEach(key => {
        delete result[key];
    });

    return result;
}


// 核心解包函数：判断并解包 ComputedRef 类型
// 不安全
export function unwrapComputedRef<T>(data: T | ComputedRef<T>): T {
    // 判断是否为 Vue 的 ComputedRef 实例（通过特征属性识别）
    if (data && typeof data === 'object' && 'value' in data && '_value' in data) {
        return (data as ComputedRef<T>).value;
    }
    return data as T;
}