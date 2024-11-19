// 初始化 LeanCloud
AV.init({
    appId: "mk7fc8K08N3d9MZwUvZ74nxo-gzGzoHsz",
    appKey: "GCVZV2BymoJq0CsXjG5GVk01",
    serverURL: "https://mk7fc8k0.lc-cn-n1-shared.com"
});

// 创建数据类
const Homework = AV.Object.extend('Homework');

// 测试连接并创建 Class
(async function() {
    try {
        // 测试连接
        const TestObject = AV.Object.extend('TestObject');
        const testObject = new TestObject();
        testObject.set('words', 'Hello world!');
        await testObject.save();
        console.log('LeanCloud 连接成功！');

        // 确保 Homework class 存在
        const homework = new Homework();
        homework.set('test', true);
        await homework.save();
        await homework.destroy();
        console.log('Homework class 创建成功！');
    } catch (error) {
        console.error('初始化失败:', error);
        if (error.code === 403) {
            console.error('安全域名验证失败，请检查域名设置');
        }
    }
})();