# 我们呼吸的风 · The Wind We Breathe

以“人与自然和谐共生”为主题的沉浸式互动网页，课程“中国式现代化的理论与实践”作品。

观众先用手拂开封门的黄沙，回到 1985 年的毛乌素，再从三段旅程中任选其一：

- **一个人（毛乌素）**：殷玉珍与美国友人“赛考斯”，五千美元种成五万多棵树，二十六年后重逢。
- **一方格（沙坡头）**：亲手铺下草方格，拖动时间轴看沙地十年复苏。
- **一个国家（库布其）**：穿行光伏长城，俯瞰“三北”绿色长城，最后在绿洲旁种下自己的一棵树。

三维沙海随滚动由黄转绿，真实照片与卫星前后对比穿插其间。

## 文件结构

```
index.html          页面结构（首页、旅程卡片、HUD、开场沙层、热点抽屉）
css/style.css       全部样式
js/util.js          工具函数：数学、噪声、随机数、颜色、矩阵
js/shaders.js       GLSL 着色器：地形、植被、实体、水面、天空、风沙、阴影
js/world.js         三个场景：毛乌素、沙坡头、库布其的地形、植被、相机路径与大气
js/story.js         叙事内容：三段旅程的文字、数据、热点与配图
js/main.js          主程序：WebGL 渲染、场景构建、滚动叙事、交互、声音与开场
img/                10 张照片与卫星影像
README.md           本说明
.nojekyll           让 GitHub Pages 原样发布文件
```

脚本按 `util → shaders → world → story → main` 的顺序加载。三维渲染直接使用浏览器自带的 WebGL2，没有用任何框架或依赖库，不需要安装和构建。字体从 Google Fonts 加载，加载不到时会自动换用系统字体。

想改文字或数据，只需要编辑 `js/story.js`；想调整场景（树的位置、镜头路线、天空颜色），编辑 `js/world.js`。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个公开仓库（Public），例如 `wind-we-breathe`。
2. 点 **Add file → Upload files**，把压缩包解压后的**全部内容**拖进去（`index.html` 要在仓库根目录，`css`、`js`、`img` 三个文件夹保持原样），点 **Commit changes**。
3. 进入仓库 **Settings → Pages**，在 *Build and deployment* 里把 Source 设为 **Deploy from a branch**，Branch 选 **main**、文件夹选 **/ (root)**，点 **Save**。
4. 等一两分钟，页面顶部会出现网址，形如 `https://你的用户名.github.io/wind-we-breathe/`，任何人都可以打开。

## 本地预览

直接双击 `index.html` 可能因浏览器安全限制无法加载图片，建议在文件夹里运行：

```
python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。

## 浏览器要求

需要支持 WebGL2 的浏览器（最新版 Chrome、Edge、Safari、Firefox）。三维场景较吃显卡，配置较低的电脑可能会卡顿。

## 图片来源与授权

以下图片来自 Wikimedia Commons 与 NASA，按原授权使用。CC BY / CC BY-SA 图片的署名需保留（网页中每张图下方也已标注）。

| 文件 | 内容 | 作者 / 来源 | 授权 |
|---|---|---|---|
| `img/muus_1985.jpg` | 毛乌素沙地卫星影像 1985 | USGS Landsat | 公有领域 |
| `img/muus_2021.jpg` | 毛乌素沙地卫星影像 2021 | ESA | CC BY-SA 4.0 |
| `img/muus_aerial_2026.jpg` | 鄂尔多斯境内毛乌素沙地航拍，2026-08-10 | Windmemories | CC BY-SA 4.0 |
| `img/muus_1964.jpg` | 治理十年后的陕西毛乌苏沙漠 | 《人民画报》1964 年第 7 期 | 公有领域 |
| `img/kubuqi_planting.jpg` | 库布其沙漠人工造林 | FreyGruppe | CC BY-SA 4.0 |
| `img/kubuqi_2017.jpg` | 库布其光伏基地 2017.12 | NASA Earth Observatory / Michala Garrison，Landsat 数据来自 USGS | 公有领域 |
| `img/kubuqi_2024.jpg` | 库布其光伏基地 2024.12 | 同上 | 公有领域 |
| `img/straw_grid.jpg` | 塔克拉玛干南缘且末县草方格，1993 | 真木太一 Maki Taichi (TARC) | CC BY 2.0 |
| `img/shapotou_river.jpg` | 宁夏中卫沙坡头与黄河 | sylvannus（Panoramio） | CC BY-SA 3.0 |
| `img/tarim_shrubs.jpg` | 塔里木沙漠公路旁灌木防护带 | Yoshi Canopus | CC BY-SA 4.0 |

图片原始页面：<https://commons.wikimedia.org/wiki/Category:Mu_Us_Desert>、<https://science.nasa.gov/earth/earth-observatory/building-a-great-solar-wall-in-china-153759/> 等。

## 文字资料

故事与数据主要来自新华网、人民日报、光明网、新京报、科技日报等公开报道（2025—2026），包括殷玉珍与“赛考斯”重逢、“三北”工程攻坚、库布其光伏治沙、沙坡头草方格等内容。
