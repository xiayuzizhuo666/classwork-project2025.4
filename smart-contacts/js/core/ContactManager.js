import { Contact } from './Contact.js';
import { Crypto } from './Crypto.js';

/**
 * 联系人管理类
 * 负责联系人数据的CRUD操作与持久化
 */
export class ContactManager {
    constructor() {
        // 确保contacts始终是数组
        this.contacts = [];
        // 初始化加密工具
        this.crypto = new Crypto();
        // 初始化时从本地存储加载数据
        this.loadFromStorage();
        // 事件回调存储(观察者模式)
        this.listeners = [];
    }

    /**
     * 从本地存储加载联系人
     */
    async loadFromStorage() {
        try {
            // 使用加密工具读取并解密数据
            const data = await this.crypto.readAndDecrypt('contacts');
            
            if (data) {
                // 验证数据格式，确保是数组
                if (!Array.isArray(data)) {
                    console.error('联系人数据格式错误，期望数组类型');
                    this.contacts = [];
                    return;
                }
                
                // 逐个验证并转换联系人数据
                this.contacts = data
                    .filter(item => {
                        // 基本字段验证
                        return item && 
                               typeof item.name === 'string' && 
                               typeof item.phone === 'string' &&
                               typeof item.category === 'string';
                    })
                    .map(item => {
                        const contact = new Contact(item);
                        // 确保日期字段正确转换
                        if (item.createdAt) {
                            contact.createdAt = new Date(item.createdAt);
                        }
                        // 提供默认值，防止字段缺失
                        contact.address = contact.address || '';
                        return contact;
                    });
                
                console.log(`成功从本地存储加载 ${this.contacts.length} 个联系人`);
            }
        } catch (e) {
            console.error('加载联系人数据失败:', e);
            // 出错时清空数据，避免应用崩溃
            this.contacts = [];
            // 尝试清除损坏的存储数据
            try {
                localStorage.removeItem('contacts');
            } catch (clearError) {
                console.error('清除损坏数据失败:', clearError);
            }
        }
    }

    /**
     * 保存联系人到本地存储
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveToStorage() {
        try {
            // 确保联系人列表存在且为数组
            if (!Array.isArray(this.contacts)) {
                console.error('联系人列表数据格式错误');
                return false;
            }
            
            const data = this.contacts.map(contact => contact.toJSON());
            
            // 使用加密工具加密并存储数据
            const success = await this.crypto.encryptAndStore('contacts', data);
            
            if (success) {
                console.log(`成功保存 ${this.contacts.length} 个联系人到本地存储`);
                this.notifyListeners();
            }
            
            return success;
        } catch (e) {
            // 处理不同类型的错误
            if (e instanceof DOMException && (e.code === 22 || e.name === 'QuotaExceededError')) {
                console.error('存储空间不足，无法保存联系人');
            } else {
                console.error('保存联系人数据失败:', e);
            }
            return false;
        }
    }

    /**
     * 检查是否存在重复联系人(同名同类别的视为重复)
     * @param {string} name 联系人姓名
     * @param {string} category 联系人类别
     * @param {string} [excludeId] 排除的联系人ID(用于编辑场景)
     * @returns {boolean} 是否存在重复
     */
    hasDuplicate(name, category, excludeId = null) {
        return this.contacts.some(contact => 
            contact.name === name && 
            contact.category === category && 
            contact.id !== excludeId
        );
    }

    /**
     * 添加新联系人
     * @param {Object} contactData 联系人信息
     * @returns {Promise<Object>} 结果对象，包含成功状态和联系人/错误信息
     */
    async addContact(contactData) {
        // 检查重复
        if (this.hasDuplicate(contactData.name, contactData.category)) {
            return {
                success: false,
                error: `已存在同名同类别的联系人: ${contactData.name}`
            };
        }
        
        const contact = new Contact(contactData);
        this.contacts.push(contact);
        
        // 尝试保存到本地存储
        const saveSuccess = await this.saveToStorage();
        if (!saveSuccess) {
            // 如果保存失败，需要回滚数据
            this.contacts.pop();
            return {
                success: false,
                error: '保存失败，请重试'
            };
        }
        
        return {
            success: true,
            contact: contact
        };
    }

    /**
     * 根据ID获取联系人
     * @param {string} id 联系人ID
     * @returns {Contact|null} 找到的联系人或null
     */
    getContactById(id) {
        return this.contacts.find(c => c.id === id) || null;
    }

    /**
     * 获取汉字的拼音首字母
     * @param {string} char 汉字字符
     * @returns {string} 拼音首字母(小写)
     */
    getPinyinFirstLetter(char) {
        // 基本拉丁字母直接返回
        if (/[a-zA-Z]/.test(char)) {
            return char.toLowerCase();
        }
        
        // 数字直接返回
        if (/\d/.test(char)) {
            return char;
        }
        
        // 汉字拼音首字母映射表（简化版，覆盖常用汉字）
        const pinyinMap = {
            'a': [19968, 20320], // 啊-吖
            'ai': [20321, 20543], // 阿-隘
            'an': [20544, 20807], // 腌-黯
            'ang': [20808, 20982], // 肮-盎
            'ao': [20983, 21199], // 敖-坳
            'ba': [21200, 21474], // 八-钯
            'bai': [21475, 21605], // 百-掰
            'ban': [21606, 21884], // 班-瓣
            'bang': [21885, 22031], // 帮-磅
            'bao': [22032, 22302], // 包-鲍
            'bei': [22303, 22530], // 杯-辈
            'ben': [22531, 22621], // 奔-畚
            'beng': [22622, 22786], // 崩-蹦
            'bi': [22787, 23009], // 逼-陛
            'bian': [23010, 23242], // 鞭-煸
            'biao': [23243, 23384], // 标-飑
            'bie': [23385, 23532], // 憋-别
            'bin': [23533, 23751], // 宾-殡
            'bing': [23752, 23942], // 兵-并
            'bo': [23943, 24190], // 拨-钵
            'bu': [24191, 24382], // 不-醭
            'ca': [24383, 24507], // 擦-礤
            'cai': [24508, 24688], // 才-菜
            'can': [24689, 24893], // 参-粲
            'cang': [24894, 25049], // 仓-沧
            'cao': [25050, 25209], // 操-糙
            'ce': [25210, 25340], // 厕-侧
            'ceng': [25341, 25462], // 层-蹭
            'cha': [25463, 25667], // 插-镲
            'chai': [25668, 25770], // 拆-钗
            'chan': [25771, 26039], // 搀-忏
            'chang': [26040, 26255], // 昌-唱
            'chao': [26256, 26410], // 超-耖
            'che': [26411, 26552], // 车-扯
            'chen': [26553, 26782], // 臣-谶
            'cheng': [26783, 27038], // 成-骋
            'chi': [27039, 27295], // 痴-敕
            'chong': [27296, 27485], // 充-铳
            'chou': [27486, 27730], // 抽-瞅
            'chu': [27731, 28049], // 出-刍
            'chuai': [28050, 28150], // 揣-踹
            'chuan': [28151, 28303], // 川-钏
            'chuang': [28304, 28473], // 创-怆
            'chui': [28474, 28603], // 吹-炊
            'chun': [28604, 28779], // 春-纯
            'chuo': [28780, 28903], // 戳-龊
            'ci': [28904, 29134], // 疵-赐
            'cong': [29135, 29386], // 匆-苁
            'cou': [29387, 29505], // 凑-辏
            'cu': [29506, 29634], // 粗-蹴
            'cuan': [29635, 29760], // 汆-窜
            'cui': [29761, 29901], // 崔-悴
            'cun': [29902, 30035], // 村-寸
            'cuo': [30036, 30253], // 磋-锉
            'da': [30254, 30485], // 搭-耷
            'dai': [30486, 30638], // 呆-殆
            'dan': [30639, 30872], // 丹-旦
            'dang': [30873, 31071], // 当-谠
            'dao': [31072, 31293], // 刀-岛
            'de': [31294, 31400], // 德-的
            'deng': [31401, 31584], // 灯-凳
            'di': [31585, 31892], // 低-缔
            'dian': [31893, 32188], // 掂-垫
            'diao': [32189, 32323], // 叼-碉
            'die': [32324, 32538], // 跌-迭
            'ding': [32539, 32780], // 丁-顶
            'diu': [32781, 32799], // 丢-铥
            'dong': [32800, 33054], // 东-董
            'dou': [33055, 33270], // 兜-斗
            'du': [33271, 33626], // 都-笃
            'duan': [33627, 33845], // 端-短
            'dui': [33846, 34020], // 堆-队
            'dun': [34021, 34243], // 吨-顿
            'duo': [34244, 34445], // 咄-躲
            'e': [34446, 34708], // 哆-哦
            'en': [34709, 34899], // 恩-蒽
            'er': [34900, 35055], // 儿-尔
            'fa': [35056, 35279], // 发-珐
            'fan': [35280, 35529], // 帆-番
            'fang': [35530, 35781], // 方-坊
            'fei': [35782, 36044], // 飞-妃
            'fen': [36045, 36310], // 分-吩
            'feng': [36311, 36592], // 丰-风
            'fo': [36593, 36741], // 佛-仏
            'fou': [36742, 36757], // 否-缶
            'fu': [36758, 37119], // 夫-弗
            'ga': [37120, 37323], // 伽-旮
            'gai': [37324, 37517], // 该-垓
            'gan': [37518, 37730], // 干-杆
            'gang': [37731, 37892], // 杠-肛
            'gao': [37893, 38150], // 篙-皋
            'ge': [38151, 38428], // 戈-哥
            'gei': [38429, 38508], // 给-匌
            'gen': [38509, 38663], // 根-亘
            'geng': [38664, 38890], // 更-庚
            'gong': [38891, 39139], // 工-弓
            'gou': [39140, 39318], // 勾-佝
            'gu': [39319, 39750], // 估-咕
            'gua': [39751, 39927], // 瓜-刮
            'guai': [39928, 40039], // 乖-拐
            'guan': [40040, 40230], // 关-官
            'guang': [40231, 40390], // 光-广
            'gui': [40391, 40607], // 归-圭
            'gun': [40608, 40715], // 衮-滚
            'guo': [40716, 40889], // 郭-国
            'ha': [40890, 41030], // 哈-铪
            'hai': [41031, 41196], // 嗨-孩
            'han': [41197, 41417], // 寒-函
            'hang': [41418, 41583], // 夯-吭
            'hao': [41584, 41775], // 壕-嚎
            'he': [41776, 42010], // 呵-喝
            'hei': [42011, 42089], // 黑-嘿
            'hen': [42090, 42230], // 痕-很
            'heng': [42231, 42419], // 亨-横
            'hong': [42420, 42595], // 轰-哄
            'hou': [42596, 42789], // 侯-后
            'hu': [42790, 43311], // 乎-呼
            'hua': [43312, 43479], // 花-华
            'huai': [43480, 43617], // 怀-徊
            'huan': [43618, 43820], // 欢-环
            'huang': [43821, 44030], // 慌-皇
            'hui': [44031, 44289], // 灰-恢
            'hun': [44290, 44470], // 昏-浑
            'huo': [44471, 44670], // 豁-活
            'ji': [44671, 45252], // 击-鸡
            'jia': [45253, 45589], // 加-夹
            'jian': [45590, 46083], // 坚-尖
            'jiang': [46084, 46390], // 将-江
            'jiao': [46391, 46742], // 交-郊
            'jie': [46743, 47093], // 阶-皆
            'jin': [47094, 47517], // 巾-今
            'jing': [47518, 47930], // 京-惊
            'jiong': [47931, 48118], // 扃-迥
            'jiu': [48119, 48299], // 纠-鸠
            'ju': [48300, 48694], // 拘-驹
            'juan': [48695, 48889], // 捐-卷
            'jue': [48890, 49250], // 撅-决
            'jun': [49251, 49450], // 军-君
            'ka': [49451, 49625], // 卡-咖
            'kai': [49626, 49785], // 开-揩
            'kan': [49786, 50010], // 刊-看
            'kang': [50011, 50160], // 扛-亢
            'kao': [50161, 50242], // 考-拷
            'ke': [50243, 50505], // 坷-苛
            'ken': [50506, 50630], // 肯-啃
            'keng': [50631, 50760], // 坑-铿
            'kong': [50761, 50890], // 空-孔
            'kou': [50891, 51045], // 抠-口
            'ku': [51046, 51307], // 哭-枯
            'kua': [51308, 51403], // 夸-垮
            'kuai': [51404, 51507], // 快-筷
            'kuan': [51508, 51647], // 宽-款
            'kuang': [51648, 51832], // 匡-狂
            'kui': [51833, 52019], // 亏-岿
            'kun': [52020, 52230], // 昆-捆
            'kuo': [52231, 52382], // 扩-阔
            'la': [52383, 52586], // 垃-啦
            'lai': [52587, 52720], // 来-崃
            'lan': [52721, 53049], // 兰-拦
            'lang': [53050, 53219], // 狼-廊
            'lao': [53220, 53379], // 捞-劳
            'le': [53380, 53539], // 乐-了
            'lei': [53540, 53749], // 擂-勒
            'leng': [53750, 53839], // 棱-冷
            'li': [53840, 54480], // 厘-梨
            'lia': [54481, 54540], // 俩-嫽
            'lian': [54541, 54991], // 帘-怜
            'liang': [54992, 55289], // 良-凉
            'liao': [55290, 55647], // 辽-聊
            'lie': [55648, 55908], // 列-裂
            'lin': [55909, 56242], // 林-临
            'ling': [56243, 56589], // 伶-玲
            'liu': [56590, 56924], // 溜-流
            'long': [56925, 57184], // 龙-笼
            'lou': [57185, 57334], // 娄-搂
            'lu': [57335, 57796], // 卢-炉
            'lv': [57797, 57980], // 驴-旅
            'luan': [57981, 58133], // 孪-滦
            'lue': [58134, 58240], // 掠-略
            'lun': [58241, 58480], // 抡-轮
            'luo': [58481, 58908], // 捋-罗
            'ma': [58909, 59170], // 妈-麻
            'mai': [59171, 59306], // 埋-买
            'man': [59307, 59600], // 蛮-满
            'mang': [59601, 59770], // 忙-茫
            'mao': [59771, 60105], // 猫-毛
            'me': [60106, 60200], // 么-嚒
            'mei': [60201, 60480], // 玫-眉
            'men': [60481, 60600], // 门-闷
            'meng': [60601, 60810], // 萌-蒙
            'mi': [60811, 61330], // 眯-弥
            'mian': [61331, 61580], // 绵-眠
            'miao': [61581, 61790], // 苗-描
            'mie': [61791, 61930], // 灭-蔑
            'min': [61931, 62122], // 民-敏
            'ming': [62123, 62280], // 名-明
            'miu': [62281, 62299], // 谬-缪
            'mo': [62300, 62689], // 摸-模
            'mou': [62690, 62830], // 哞-牟
            'mu': [62831, 63065], // 模-母
            'na': [63066, 63240], // 拿-哪
            'nai': [63241, 63370], // 乃-奶
            'nan': [63371, 63520], // 男-南
            'nang': [63521, 63640], // 囊-馕
            'nao': [63641, 63840], // 挠-恼
            'ne': [63841, 63920], // 呢-哪
            'nei': [63921, 64030], // 馁-内
            'nen': [64031, 64080], // 嫩-恁
            'neng': [64081, 64170], // 能-脳
            'ni': [64171, 64689], // 妮-泥
            'nian': [64690, 64960], // 拈-年
            'niang': [64961, 65040], // 娘-酿
            'niao': [65041, 65130], // 鸟-尿
            'nie': [65131, 65380], // 捏-聂
            'nin': [65381, 65440], // 您-恁
            'ning': [65441, 65580], // 宁-拧
            'niu': [65581, 65680], // 牛-扭
            'nong': [65681, 65790], // 农-弄
            'nu': [65791, 65900], // 奴-努
            'nv': [65901, 65940], // 女-钕
            'nuan': [65941, 66010], // 暖-奻
            'nue': [66011, 66050], // 虐-疟
            'nuo': [66051, 66170], // 挪-诺
            'o': [66171, 66230], // 哦-噢
            'ou': [66231, 66430], // 欧-殴
            'pa': [66431, 66570], // 趴-啪
            'pai': [66571, 66740], // 拍-排
            'pan': [66741, 67030], // 盘-潘
            'pang': [67031, 67180], // 乓-庞
            'pao': [67181, 67380], // 抛-跑
            'pei': [67381, 67540], // 呸-陪
            'pen': [67541, 67640], // 喷-盆
            'peng': [67641, 67910], // 烹-朋
            'pi': [67911, 68330], // 砒-皮
            'pian': [68331, 68520], // 片-偏
            'piao': [68521, 68700], // 飘-嫖
            'pie': [68701, 68800], // 撇-苤
            'pin': [68801, 69000], // 拼-贫
            'ping': [69001, 69260], // 乒-平
            'po': [69261, 69540], // 坡-婆
            'pu': [69541, 69880], // 扑-铺
            'qi': [69881, 70449], // 妻-七
            'qia': [70450, 70580], // 掐-卡
            'qian': [70581, 71099], // 千-牵
            'qiang': [71100, 71309], // 枪-腔
            'qiao': [71310, 71519], // 悄-桥
            'qie': [71520, 71649], // 切-茄
            'qin': [71650, 71939], // 钦-琴
            'qing': [71940, 72249], // 衾-青
            'qiong': [72250, 72409], // 穹-穷
            'qiu': [72410, 72679], // 丘-秋
            'qu': [72680, 73149], // 区-曲
            'quan': [73150, 73349], // 圈-权
            'que': [73350, 73649], // 炔-缺
            'qun': [73650, 73849], // 裙-群
            'ran': [73850, 74039], // 然-冉
            'rang': [74040, 74199], // 瓤-嚷
            'rao': [74200, 74359], // 饶-扰
            're': [74360, 74449], // 惹-热
            'ren': [74450, 74739], // 人-仁
            'reng': [74740, 74859], // 扔-仍
            'ri': [74860, 74929], // 日-驲
            'rong': [74930, 75209], // 戎-荣
            'rou': [75210, 75349], // 肉-揉
            'ru': [75350, 75709], // 如-儒
            'ruan': [75710, 75819], // 阮-软
            'rui': [75820, 75939], // 蕊-瑞
            'run': [75940, 76039], // 闰-润
            'ruo': [76040, 76209], // 若-弱
            'sa': [76210, 76369], // 撒-仨
            'sai': [76370, 76509], // 腮-塞
            'san': [76510, 76729], // 三-伞
            'sang': [76730, 76889], // 桑-丧
            'sao': [76890, 77049], // 搔-扫
            'se': [77050, 77189], // 涩-色
            'sen': [77190, 77249], // 森-椮
            'seng': [77250, 77329], // 僧-鬙
            'sha': [77330, 77619], // 莎-杀
            'shai': [77620, 77729], // 筛-晒
            'shan': [77730, 78209], // 山-删
            'shang': [78210, 78549], // 商-伤
            'shao': [78550, 78809], // 梢-烧
            'she': [78810, 79039], // 奢-舌
            'shen': [79040, 79499], // 申-身
            'sheng': [79500, 79819], // 生-声
            'shi': [79820, 80449], // 师-诗
            'shou': [80450, 80709], // 收手-首
            'shu': [80710, 81209], // 书-疏
            'shua': [81210, 81289], // 刷-耍
            'shuai': [81290, 81389], // 摔-帅
            'shuan': [81390, 81489], // 拴-闩
            'shuang': [81490, 81609], // 霜-双
            'shui': [81610, 81709], // 谁-水
            'shun': [81710, 81899], // 顺-舜
            'shuo': [81900, 82019], // 说-妁
            'si': [82020, 82529], // 司-思
            'song': [82530, 82889], // 松-宋
            'sou': [82890, 83139], // 搜-艘
            'su': [83140, 83479], // 苏-酥
            'suan': [83480, 83589], // 酸-算
            'sui': [83590, 83869], // 虽-隋
            'sun': [83870, 84049], // 孙-损
            'suo': [84050, 84389], // 唆-梭
            'ta': [84390, 84649], // 他-她
            'tai': [84650, 84899], // 胎-苔
            'tan': [84900, 85319], // 坍-贪
            'tang': [85320, 85689], // 汤-唐
            'tao': [85690, 86009], // 饕-涛
            'te': [86010, 86099], // 忑-特
            'teng': [86100, 86249], // 腾-疼
            'ti': [86250, 86789], // 剔-梯
            'tian': [86790, 87089], // 天-填
            'tiao': [87090, 87339], // 挑-条
            'tie': [87340, 87489], // 贴-铁
            'ting': [87490, 87769], // 厅-听
            'tong': [87770, 88049], // 通-同
            'tou': [88050, 88199], // 偷-头
            'tu': [88200, 88549], // 凸-突
            'tuan': [88550, 88659], // 团-抟
            'tui': [88660, 88829], // 推-颓
            'tun': [88830, 89049], // 吞-臀
            'tuo': [89050, 89359], // 托-脱
            'wa': [89360, 89549], // 洼-挖
            'wai': [89550, 89649], // 歪-崴
            'wan': [89650, 90049], // 弯-湾
            'wang': [90050, 90309], // 王-往
            'wei': [90310, 90919], // 危-微
            'wen': [90920, 91249], // 温-文
            'weng': [91250, 91409], // 翁-嗡
            'wo': [91410, 91629], // 挝-我
            'wu': [91630, 92159], // 五-午
            'xi': [92160, 92789], // 昔-西
            'xia': [92790, 93149], // 呷-瞎
            'xian': [93150, 93719], // 仙-先
            'xiang': [93720, 94159], // 乡-香
            'xiao': [94160, 94669], // 肖-消
            'xie': [94670, 95159], // 些-歇
            'xin': [95160, 95489], // 心-辛
            'xing': [95490, 95929], // 星-腥
            'xiong': [95930, 96109], // 兄-雄
            'xiu': [96110, 96339], // 休-修
            'xu': [96340, 96899], // 虚-徐
            'xuan': [96900, 97229], // 轩-宣
            'xue': [97230, 97409], // 靴-薛
            'xun': [97410, 97809], // 熏-寻
            'ya': [97810, 98249], // 压-呀
            'yan': [98250, 98929], // 押-烟
            'yang': [98930, 99329], // 央-羊
            'yao': [99330, 99849], // 幺-腰
            'ye': [99850, 100259], // 噎-耶
            'yi': [100260, 100979], // 一-衣
            'yin': [100980, 101489], // 因-阴
            'ying': [101490, 102049], // 英-婴
            'yo': [102050, 102109], // 哟-唷
            'yong': [102110, 102489], // 佣-用
            'you': [102490, 102999], // 优-游
            'yu': [103000, 103719], // 纡-迂
            'yuan': [103720, 104239], // 冤-元
            'yue': [104240, 104489], // 曰-约
            'yun': [104490, 105049], // 晕-云
            'za': [105050, 105209], // 匝-咂
            'zai': [105210, 105349], // 栽-宰
            'zan': [105350, 105529], // 咱-攒
            'zang': [105530, 105649], // 赃-脏
            'zao': [105650, 105929], // 遭-糟
            'ze': [105930, 106149], // 责-则
            'zei': [106150, 106199], // 贼-谮
            'zen': [106200, 106289], // 怎-谮
            'zeng': [106290, 106489], // 憎-增
            'zha': [106490, 106949], // 扎-喳
            'zhai': [106950, 107109], // 斋-宅
            'zhan': [107110, 107489], // 占-沾
            'zhang': [107490, 107809], // 张-章
            'zhao': [107810, 108049], // 钊-招
            'zhe': [108050, 108429], // 遮-折
            'zhen': [108430, 108909], // 针-珍
            'zheng': [108910, 109349], // 睁-正
            'zhi': [109350, 110179], // 之-知
            'zhong': [110180, 110519], // 忠-中
            'zhou': [110520, 110999], // 周-舟
            'zhu': [111000, 111509], // 朱-珠
            'zhua': [111510, 111589], // 抓-爪
            'zhuai': [111590, 111649], // 拽-转
            'zhuan': [111650, 111939], // 专-砖
            'zhuang': [111940, 112139], // 庄-装
            'zhui': [112140, 112349], // 追-锥
            'zhun': [112350, 112509], // 谆-准
            'zhuo': [112510, 112839], // 拙-卓
            'zi': [112840, 113319], // 孜-资
            'zong': [113320, 113539], // 宗-棕
            'zou': [113540, 113729], // 邹-走
            'zu': [113730, 114059], // 租-足
            'zuan': [114060, 114169], // 钻-纂
            'zui': [114170, 114259], // 嘴-醉
            'zun': [114260, 114399], // 尊-遵
            'zuo': [114400, 114789], // 昨-作
            'zz': [114790, 114879] // 仄-咗
        };
        
        const charCode = char.charCodeAt(0);
        
        // 遍历拼音映射表，找到对应的首字母
        for (const [letter, [start, end]] of Object.entries(pinyinMap)) {
            if (charCode >= start && charCode <= end) {
                return letter[0].toLowerCase();
            }
        }
        
        // 无法识别的字符返回空字符串
        return '';
    }
    
    /**
     * 获取字符串的拼音首字母组合
     * @param {string} str 输入字符串
     * @returns {string} 拼音首字母组合(小写)
     */
    getPinyinInitials(str) {
        return str.split('').map(char => this.getPinyinFirstLetter(char)).join('');
    }

    /**
     * 筛选联系人
     * @param {string} category 类别(all/办公/个人)
     * @param {string} keyword 搜索关键词
     * @returns {Contact[]} 筛选后的联系人
     */
    filterContacts(category, keyword = '') {
        return this.contacts.filter(contact => {
            // 类别筛选
            const matchCategory = category === 'all' || contact.category === category;
            
            // 关键词为空时，只按类别筛选
            if (keyword === '') {
                return matchCategory;
            }
            
            // 关键词不为空时，进行多字段模糊匹配
            const lowerKeyword = keyword.toLowerCase();
            
            // 获取联系人各字段的拼音首字母
            const nameInitials = this.getPinyinInitials(contact.name);
            const addressInitials = this.getPinyinInitials(contact.address);
            const categoryInitials = this.getPinyinInitials(contact.category);
            
            // 支持在多个字段中搜索，包括：姓名、电话、单位
            // 同时支持拼音首字母搜索
            const matchKeyword = 
                contact.name.toLowerCase().includes(lowerKeyword) ||
                nameInitials.includes(lowerKeyword) ||
                contact.phone.includes(keyword) || // 电话保持原样搜索，因为可能包含数字和分隔符
                contact.address.toLowerCase().includes(lowerKeyword) ||
                addressInitials.includes(lowerKeyword) ||
                contact.category.toLowerCase().includes(lowerKeyword) ||
                categoryInitials.includes(lowerKeyword);
            
            return matchCategory && matchKeyword;
        });
    }

    /**
     * 注册数据变化监听器
     * @param {Function} callback 数据变化时的回调
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * 通知所有监听器数据已变化
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback());
    }

    /**
     * 删除联系人
     * @param {string} id 联系人ID
     * @returns {Promise<Object>} 删除结果，包含成功状态和错误信息
     */
    async deleteContact(id) {
        const contactIndex = this.contacts.findIndex(c => c.id === id);
        
        if (contactIndex === -1) {
            return {
                success: false,
                error: '联系人不存在'
            };
        }

        // 从数组中移除联系人
        const deletedContact = this.contacts.splice(contactIndex, 1)[0];
        
        // 保存到本地存储
        const saveSuccess = await this.saveToStorage();
        if (!saveSuccess) {
            // 如果保存失败，需要回滚数据
            this.contacts.splice(contactIndex, 0, deletedContact);
            return {
                success: false,
                error: '删除失败，请重试'
            };
        }
        
        return {
            success: true,
            contact: deletedContact
        };
    }

    /**
     * 更新联系人
     * @param {string} id 联系人ID
     * @param {Object} updatedData 更新的联系人数据
     * @returns {Promise<Object>} 更新结果，包含成功状态和联系人/错误信息
     */
    async updateContact(id, updatedData) {
        // 查找联系人
        const contactIndex = this.contacts.findIndex(c => c.id === id);
        
        if (contactIndex === -1) {
            return {
                success: false,
                error: '联系人不存在'
            };
        }

        // 检查是否存在重复联系人（排除当前ID）
        if (this.hasDuplicate(updatedData.name, updatedData.category, id)) {
            return {
                success: false,
                error: `已存在同名同类别的联系人: ${updatedData.name}`
            };
        }

        // 获取原始联系人
        const originalContact = this.contacts[contactIndex];
        
        // 创建更新后的联系人对象
        const updatedContact = new Contact({
            ...originalContact.toJSON(),
            ...updatedData
        });
        
        // 保留原始创建时间
        updatedContact.createdAt = originalContact.createdAt;
        
        // 更新联系人列表
        this.contacts[contactIndex] = updatedContact;
        
        // 保存到本地存储
        const saveSuccess = await this.saveToStorage();
        if (!saveSuccess) {
            // 如果保存失败，需要回滚数据
            this.contacts[contactIndex] = originalContact;
            return {
                success: false,
                error: '更新失败，请重试'
            };
        }
        
        return {
            success: true,
            contact: updatedContact
        };
    }

    /**
     * 导出联系人数据为CSV格式
     * @param {string} category 要导出的类别('all', '办公', '个人')
     * @returns {boolean} 是否成功导出
     */
    exportToCSV(category = 'all') {
        try {
            // 获取要导出的联系人数据
            const contactsToExport = category === 'all' 
                ? this.contacts 
                : this.contacts.filter(c => c.category === category);

            if (contactsToExport.length === 0) {
                alert('没有可导出的联系人数据');
                return false;
            }

            // 构建CSV内容
            const csvHeaders = ['姓名', '电话', '单位', '类别'];
            const csvRows = contactsToExport.map(contact => [
                `"${contact.name}"`,
                `"${contact.phone}"`,
                `"${contact.address}"`,
                `"${contact.category}"`
            ]);

            // 合并头部和数据行
            const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

            // 添加UTF-8 BOM，确保Excel正确显示中文
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });

            // 创建下载链接
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // 生成文件名，包含当前日期
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD格式
            const categoryText = category === 'all' ? '全部' : category;
            link.setAttribute('download', `通讯录_${categoryText}_${dateStr}.csv`);
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL对象
            URL.revokeObjectURL(url);
            
            console.log(`成功导出 ${contactsToExport.length} 个联系人`);
            return true;
            
        } catch (error) {
            console.error('导出CSV失败:', error);
            alert('导出失败，请重试');
            return false;
        }
    }
}