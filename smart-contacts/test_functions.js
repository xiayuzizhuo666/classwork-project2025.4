// 测试脚本 - 用于验证联系人管理系统的主要功能
console.log('===== 联系人管理系统测试 =====');

// 测试1: 电话号码格式化功能
function testPhoneFormatting() {
    console.log('\n测试1: 电话号码格式化');
    
    // 创建一个临时的DetailModal实例用于测试
    const modalElement = document.createElement('div');
    modalElement.innerHTML = `
        <div class="contact-phone"></div>
        <button class="copy-phone-btn"></button>
    `;
    document.body.appendChild(modalElement);
    
    // 创建DetailModal实例
    const detailModal = new DetailModal(modalElement);
    
    // 测试各种电话号码格式
    const testPhones = [
        { input: '13512345678', expected: '135-1234-5678', desc: '11位手机号' },
        { input: '135 1234 5678', expected: '135-1234-5678', desc: '带空格的手机号' },
        { input: '01012345678', expected: '01012345678', desc: '非11位电话号码' },
        { input: '123456', expected: '123456', desc: '6位短号' }
    ];
    
    let allPassed = true;
    
    testPhones.forEach(test => {
        const formatted = detailModal.formatPhoneNumber(test.input);
        const passed = formatted === test.expected;
        console.log(`${test.desc}: ${passed ? '✓ 通过' : `✗ 失败 (期望: ${test.expected}, 实际: ${formatted})`}`);
        if (!passed) allPassed = false;
    });
    
    // 清理
    document.body.removeChild(modalElement);
    
    return allPassed;
}

// 测试2: 数据存储与加载
function testDataPersistence() {
    console.log('\n测试2: 数据存储与加载');
    
    // 保存原始联系人数据
    const originalContacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    
    // 创建测试数据
    const testContacts = [
        { name: '测试用户1', phone: '13900001111', address: '测试地址1', category: '办公' },
        { name: '测试用户2', phone: '13900002222', address: '测试地址2', category: '个人' }
    ];
    
    try {
        // 保存测试数据
        localStorage.setItem('contacts', JSON.stringify(testContacts));
        
        // 模拟加载过程
        const loadedContacts = JSON.parse(localStorage.getItem('contacts'));
        
        // 验证数据完整性
        const contactsMatch = loadedContacts.length === testContacts.length && 
                            loadedContacts.every((contact, index) => 
                                contact.name === testContacts[index].name &&
                                contact.phone === testContacts[index].phone);
        
        console.log(`数据保存与加载: ${contactsMatch ? '✓ 通过' : '✗ 失败'}`);
        
        // 恢复原始数据
        localStorage.setItem('contacts', JSON.stringify(originalContacts));
        
        return contactsMatch;
    } catch (error) {
        console.error('数据持久化测试失败:', error);
        // 确保恢复原始数据
        localStorage.setItem('contacts', JSON.stringify(originalContacts));
        return false;
    }
}

// 测试3: 重复联系人检查
function testDuplicateCheck() {
    console.log('\n测试3: 重复联系人检查');
    
    // 假设ContactManager已在全局初始化
    if (!window.app || !window.app.contactManager) {
        console.log('✗ 失败: 无法访问ContactManager实例');
        return false;
    }
    
    const manager = window.app.contactManager;
    
    // 模拟联系人数据
    const mockContacts = [
        { name: '重复测试', phone: '13800001111', address: '地址1', category: '办公' },
        { name: '不同类别', phone: '13800002222', address: '地址2', category: '个人' }
    ];
    
    // 保存原始联系人数据
    const originalContacts = manager.contacts;
    
    try {
        // 设置测试数据
        manager.contacts = mockContacts;
        
        // 测试重复检查
        const testCases = [
            { name: '重复测试', category: '办公', expected: true, desc: '同名同类别' },
            { name: '重复测试', category: '个人', expected: false, desc: '同名不同类别' },
            { name: '不存在用户', category: '办公', expected: false, desc: '不存在的用户' }
        ];
        
        let allPassed = true;
        
        testCases.forEach(test => {
            // 检查hasDuplicate方法是否存在
            if (typeof manager.hasDuplicate === 'function') {
                const result = manager.hasDuplicate(test.name, test.category);
                const passed = result === test.expected;
                console.log(`${test.desc}: ${passed ? '✓ 通过' : `✗ 失败 (期望: ${test.expected}, 实际: ${result})`}`);
                if (!passed) allPassed = false;
            } else {
                console.log('✗ 失败: hasDuplicate方法不存在');
                allPassed = false;
            }
        });
        
        // 恢复原始数据
        manager.contacts = originalContacts;
        
        return allPassed;
    } catch (error) {
        console.error('重复检查测试失败:', error);
        // 确保恢复原始数据
        manager.contacts = originalContacts;
        return false;
    }
}

// 测试4: 搜索功能
function testSearchFunction() {
    console.log('\n测试4: 搜索功能');
    
    if (!window.app || !window.app.contactManager) {
        console.log('✗ 失败: 无法访问ContactManager实例');
        return false;
    }
    
    const manager = window.app.contactManager;
    const originalContacts = manager.contacts;
    
    try {
        // 设置测试数据
        manager.contacts = [
            { name: '张三', phone: '13512345678', address: 'XX科技公司', category: '办公' },
            { name: '李四', phone: '13887654321', address: 'XX设计院', category: '个人' }
        ];
        
        // 测试搜索功能
        const testCases = [
            { category: 'all', keyword: '科技', expectedCount: 1, desc: '搜索关键词"科技"' },
            { category: 'all', keyword: '138', expectedCount: 1, desc: '搜索电话前缀"138"' },
            { category: '办公', keyword: '', expectedCount: 1, desc: '筛选"办公"类别' },
            { category: '个人', keyword: '', expectedCount: 1, desc: '筛选"个人"类别' },
            { category: '办公', keyword: '李四', expectedCount: 0, desc: '在"办公"类别中搜索"李四"' }
        ];
        
        let allPassed = true;
        
        testCases.forEach(test => {
            const results = manager.filterContacts(test.category, test.keyword);
            const passed = results.length === test.expectedCount;
            console.log(`${test.desc}: ${passed ? '✓ 通过' : `✗ 失败 (期望: ${test.expectedCount}个结果, 实际: ${results.length}个结果)`}`);
            if (!passed) allPassed = false;
        });
        
        // 恢复原始数据
        manager.contacts = originalContacts;
        
        return allPassed;
    } catch (error) {
        console.error('搜索功能测试失败:', error);
        // 确保恢复原始数据
        manager.contacts = originalContacts;
        return false;
    }
}

// 运行所有测试
function runAllTests() {
    console.log('开始运行所有测试...');
    
    const tests = [
        { name: '电话号码格式化', testFn: testPhoneFormatting },
        { name: '数据持久化', testFn: testDataPersistence },
        { name: '重复联系人检查', testFn: testDuplicateCheck },
        { name: '搜索功能', testFn: testSearchFunction }
    ];
    
    let allTestsPassed = true;
    
    tests.forEach(test => {
        console.log(`\n--- 运行测试: ${test.name} ---`);
        const passed = test.testFn();
        if (!passed) allTestsPassed = false;
    });
    
    console.log('\n===== 测试结果汇总 =====');
    if (allTestsPassed) {
        console.log('🎉 所有测试通过!');
    } else {
        console.log('❌ 部分测试失败,请检查代码.');
    }
    
    return allTestsPassed;
}

// 当页面加载完成后运行测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    // 如果页面已经加载完成,延迟运行测试以确保所有组件初始化完成
    setTimeout(runAllTests, 1000);
}