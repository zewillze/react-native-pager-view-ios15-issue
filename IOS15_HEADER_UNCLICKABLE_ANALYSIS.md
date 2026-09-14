# iOS 15：进详情页返回后，顶部导航栏按钮点击失效 —— 根因分析与修复

## TL;DR

* **根因**：`react-native-pager-view@9.0.4` 的 iOS 实现把 SwiftUI `TabView(.page)` 包在
  `UIHostingController` 里，并作为**子 ViewController** 挂到 React Native 的 VC 树上。
  在 iOS 15 上，SwiftUI 内部的 `UIKitNavigationBarBridge` 会在该宿主 view 出现时调用
  `-[UINavigationController setNavigationBarHidden:NO]`，把 `react-native-screens` 为底部
  Tab 容器**刻意隐藏**的 `UINavigationBar` 重新显示出来。
  这条 bar 的 frame 正好是 `(0 47; 428 44)`，也就是 stack 的 JS header 按钮所在的区域；
  它又是 `UILayoutContainerView` 的最上层子视图，于是该区域所有触摸都被它的
  `_UINavigationBarContentView` 吃掉，header 上的 `Pressable` 永远收不到点击。
* **为什么只有 iOS 15**：`hostingControllerWillAppear → setNavigationBarHidden:NO` 这个
  “劫持”行为来自 iOS 15 的 SwiftUI 内部 bridge；更高版本不会再这样强行显示导航栏。
* **为什么和 `createMaterialTopTabNavigator` 有关**：它是整棵 VC 树里**唯一**把 SwiftUI
  宿主塞进 UIKit 层次结构的东西（`@react-navigation/material-top-tabs` → `react-native-tab-view`
  → `react-native-pager-view`）。去掉它，同一个 `UINavigationBar` 会一直保持 `hidden = YES`。
* **修复**：见下方三个方案，**方案 A / B 均已在 iOS 15.2 模拟器上实测通过**。

复现环境：iPhone 13 Pro Max / **iOS 15.2** 模拟器，Xcode 26.6，React Native 0.84.1，
`@react-navigation/{native,stack,bottom-tabs,material-top-tabs}` v7，`react-native-tab-view` 4.3.2，
`react-native-pager-view` 9.0.4，`react-native-screens` 4.27.0。

---

## 1. 现象与直接证据

用 `lldb` 对运行中的 App 做 `hitTest`（`hitTest` 的结果就决定了触摸会被谁接收），
同一个坐标 `(38, 70)`（左上角 “Button” 的圆心）：

| 状态 | `hitTest(38, 70)` 结果 |
| --- | --- |
| 刚进入首页（正常） | `RCTParagraphComponentView`，`attributedText = Button`（真正的 RN 按钮） |
| 进入详情页再返回后（复现） | `_UINavigationBarContentView`（一条 UIKit 原生导航栏） |

同一根 `UINavigationBar` 对象在两种状态下的属性：

| 状态 | frame | hidden |
| --- | --- | --- |
| 刚进入首页 | `(0 -91; 428 44)` | `YES` |
| 返回首页后 | `(0 47; 428 44)` | **可见** |

`428 × 44` @ y=47 正好覆盖 JS header 的按钮行（状态栏 47pt 之下、header 高 44pt），
所以 “顶部导航栏按钮点不动” 的观感完全对得上。

层级关系（精简）：

```
UIWindow
└─ RCTSurfaceHostingProxyRootView
   └─ RCTRootComponentView
      └─ RNSScreenNavigationContainerView          ← react-native-screens，tag=274
         └─ UILayoutContainerView                  ← UINavigationController 的 view
            ├─ UINavigationTransitionView          ← 所有 RN 内容（含 JS header）在这里
            │  └─ ... RNSScreenView → JS header / TopTab → PagerView ...
            └─ UINavigationBar                     ← 最上层子视图；正常应 hidden=YES
```

注意 `UINavigationBar` 是 `UILayoutContainerView` 的**最后一个**子视图，也就是最上层；
它一旦可见，就盖住了下面 `UINavigationTransitionView` 里 JS 渲染的 header。

---

## 2. 调用链（断点抓到的“真凶”）

在 `-[UINavigationController setNavigationBarHidden:animated:]` 上打断点，
走一遍 “进详情页 → 返回”，得到：

```
#0  -[UINavigationController setNavigationBarHidden:animated:]        (hidden = NO)
#1  SwiftUI.UIKitNavigationBarBridge.hostingControllerWillAppear(animated:)
#2  SwiftUI._UIHostingView.viewControllerWillAppear(transitionCoordinator:animated:)
#3  SwiftUI.UIHostingController._viewWillAppear(_:)
#4  SwiftUI.UIHostingController.viewWillAppear(_:)
#6  -[UIViewController _setViewAppearState:isAnimating:]
...
#13 -[UIViewController viewWillMoveToWindow:]
#15 -[UIView(Internal) _addSubview:positioned:relativeTo:]
#16 -[RNSScreenContainerView attachScreen:atIndex:]      ← react-native-screens 重新挂载屏幕
#17 -[RNSScreenContainerView updateContainer]
#18 -[RNSScreenContainerView markChildUpdated]
#19 -[RNSScreenView setActivityStateOrNil:]
#20 -[RNSScreenView updateProps:oldProps:]
```

即：pop 回首页时 `react-native-screens` 重新 attach 屏幕 → SwiftUI 宿主 view “将要出现”
→ SwiftUI bridge 去把**最近的** `UINavigationController` 的导航栏显示出来 → 这个
`UINavigationController` 恰好是底部 Tab 的容器 `RNSContainerNavigationController`。

### 这条 UINavigationController 是哪来的？

`@react-navigation/bottom-tabs` v7 在 `BottomTabView` 里计算：

```ts
// 没有动画时只有“可见 / 不可见”两种状态
const hasTwoStates = !routes.some((route) => hasAnimation(descriptors[route.key].options));
...
<MaybeScreenContainer hasTwoStates={hasTwoStates} ... />
```

`hasTwoStates=true` 时，react-native-screens 的 `ScreenContainer` 会渲染
`ScreenNavigationContainer`，其原生实现：

```objc
// react-native-screens/ios/RNSScreenNavigationContainer.mm
- (void)setupController {
  self.controller = [[RNSContainerNavigationController alloc] init];   // ← UINavigationController 子类
  [(RNSContainerNavigationController *)self.controller setNavigationBarHidden:YES animated:NO];
  [self addSubview:self.controller.view];
}

- (void)updateContainer {
  for (RNSScreenView *screen in self.reactSubviews) {
    if (screen.activityState == RNSActivityStateOnTop) {
      [(RNSContainerNavigationController *)self.controller setViewControllers:@[ screen.controller ] animated:NO];
      [screen notifyFinishTransitioning];
    }
  }
}
```

所以“隐藏的导航栏”是它自己设的；而 iOS 15 的 SwiftUI bridge 把它又打开了。

---

## 3. 反证（确认 `material-top-tabs` 是必要条件）

保持其它一切不变，只把首页里的 `TopTab.Navigator`（pager）换成普通 `View`，
再走一遍 “进详情 → 返回”：

```
hitTest(38,70) -> RCTParagraphComponentView (Button)      ✅ 正常
<UINavigationBar: ...; frame = (0 -91; 428 44); hidden = YES>   ✅ 仍然是隐藏的
```

同一根 `UINavigationBar` 依然存在（底部 Tab 容器创建的），但**不会被显示出来**。
说明触发者就是 pager-view 带入的 SwiftUI 宿主。

---

## 4. 解决方案

### 方案 A（推荐，根治，已验证）：patch `react-native-pager-view`

让 SwiftUI 宿主在 appearance 回调前后保留外层导航栏的 `hidden` 状态，
不要让它把别人故意隐藏的 bar 打开。改动在
`node_modules/react-native-pager-view/ios/PagerViewProvider.swift`：

```swift
/// UIHostingController 会让 SwiftUI 安装 UIKitNavigationBarBridge，
/// 它在宿主 view 出现时会调用 -[UINavigationController setNavigationBarHidden:NO]（iOS 15）。
/// 当那个导航栏是被刻意隐藏的（例如 react-native-screens 为 hasTwoStates 容器创建的），
/// 它就会重新显示一条空导航栏并吃掉下方 RN 视图的触摸。
/// 因此在 appearance 前后保留原来的可见性。
final class PagerHostingController<Content: View>: UIHostingController<Content> {
  override func viewWillAppear(_ animated: Bool) {
    let navigationController = enclosingNavigationController
    let wasNavigationBarHidden = navigationController?.isNavigationBarHidden == true
    super.viewWillAppear(animated)
    if wasNavigationBarHidden {
      navigationController?.setNavigationBarHidden(true, animated: false)
    }
  }

  private var enclosingNavigationController: UINavigationController? {
    if let navigationController { return navigationController }
    var viewController: UIViewController? = self
    while let current = viewController {
      if let navigationController = current as? UINavigationController { return navigationController }
      viewController = current.parent
    }
    return nil
  }
}
```

并把 `setupView()` 里的

```swift
let hostingController = UIHostingController(rootView: PagerView(props: props, delegate: delegate))
```

改成

```swift
let hostingController = PagerHostingController(rootView: PagerView(props: props, delegate: delegate))
```

补丁已生成：`patches/react-native-pager-view+9.0.4.patch`（已用 `git apply --check` 验证，
patch-package 可用；当前 `node_modules` 里也已就地应用，所以现在就能跑）。

持久化：

```bash
yarn add -D patch-package
# package.json 增加："postinstall": "patch-package"
```

**实测**：应用补丁并重新构建后，走一遍 “进详情 → 返回”，
`hitTest(38,70)` 命中 `RCTParagraphComponentView("Button")`，header 按钮恢复可点，
且层级里不再出现多余的 `UINavigationBar`，其它 UI 无变化。

> 注意：`react-native-pager-view@8.x` 同样是 SwiftUI 实现（podspec 一样依赖 `SwiftUIIntrospect`），
> 所以「降级到 8.x」并不能规避这个问题。

### 方案 B（零 patch 快速规避，已验证）：不要让底部 Tab 创建 `UINavigationController`

只要 `hasTwoStates` 变成 `false`，或者干脆不用原生屏幕容器，就不会有那条隐藏导航栏，
自然也就没有东西可以被 SwiftUI 打开。两种一行改法：

```tsx
// 改法 1：去掉底部 Tab 的原生 Screen 容器（不改变切换动画）
<Tab.Navigator detachInactiveScreens={false} ...>
```

```tsx
// 改法 2：给底部 Tab 任意非 'none' 的过渡动画 → hasTwoStates 变 false
<Tab.Navigator screenOptions={{ animation: 'fade', ... }} ...>
```

两者都在 iOS 15.2 上实测通过（返回首页后 `hitTest` 命中真实 RN 按钮；
改法 1 下层级里连 `UINavigationBar` 都不存在了）。

代价：
* 改法 1：不活跃的 Tab 页面不再卸载，内存/首次渲染开销略增；
* 改法 2：Tab 切换多了一段过渡动画（视觉变化）。

### 方案 C（可选）：patch `react-native-screens`

在 `RNSScreenNavigationContainerView.updateContainer` 末尾重新断言自己的不变量：

```objc
[(RNSContainerNavigationController *)self.controller setNavigationBarHidden:YES animated:NO];
```

因为 bar 被打开发生在 `updateContainer` 内部的 `attachScreen` 过程中，所以在这里补一刀
也能修好。适合“就想改 react-native-screens”的场景，但语义上不如方案 A 精准——
打开导航栏的是 SwiftUI，不是 react-native-screens。

---

## 5. 如何自己确认

1. 用 `xcrun simctl` 启动 App（iOS 15.x 模拟器）。
2. 进详情页再返回。
3. `lldb` attach 后执行：

```
expr -l objc++ -- UIView *$v = (UIView *)[[[UIApplication sharedApplication] keyWindow] hitTest:(CGPoint){38,70} withEvent:nil]
po $v
```

命中 `_UINavigationBarContentView` = 复现；命中 `RCTParagraphComponentView`（Button）= 已修复。

想在 `-[UINavigationController setNavigationBarHidden:animated:]` 上打断点看调用栈，
把断点条件设成 “hidden == NO” 即可（arm64 上是 `x2 == 0`）。
