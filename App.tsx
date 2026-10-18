import * as React from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  type StackScreenProps,
} from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import headerBg from './assets/header-bg.png';

// ---------- 类型 ----------

type HomeStackParamList = {
  Home: undefined;
  Detail: { id: string; title: string };
};

type RootTabParamList = {
  HomeTab: undefined;
  InfoTab: undefined;
};

type HomeTopTabParamList = {
  ListTab: undefined;
  ViewTab: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const TopTab = createMaterialTopTabNavigator<HomeTopTabParamList>();

// 首页自定义 Header 的内容高度（不含状态栏），需要改高度只改这里
const HOME_HEADER_HEIGHT = 60;


// ---------- 首页 Header 背景图（配合 headerTransparent 使用） ----------

function HomeHeaderBackground() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={headerBg}
      resizeMode="cover"
      style={[styles.header, { height: HOME_HEADER_HEIGHT + insets.top }]}
    >
      <View style={styles.headerOverlay} />
    </ImageBackground>
  );
}

// ---------- 首页导航栏左侧：icon（不可点击） + 按钮（可点击） ----------

function HomeHeaderLeft() {
  return (
    <View style={styles.headerLeftRow}>


      {/* 可点击的按钮 */}
      <Pressable
        hitSlop={8}
        onPress={() => Alert.alert('OnPress')}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.headerButtonPressed,
        ]}
      >
        <Text style={styles.headerButtonText}>Button</Text>
      </Pressable>
    </View>
  );
}

// ---------- 首页导航栏右侧：加号按钮 ----------

function HomeHeaderRight() {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => Alert.alert('加号按钮', '你点击了导航栏右侧的加号按钮')}
      style={({ pressed }) => [
        styles.headerPlusButton,
        pressed && styles.headerButtonPressed,
      ]}
    >
      <Text style={styles.headerPlusText}>＋</Text>
    </Pressable>
  );
}

// ---------- 首页列表 ----------

type HomeListItem = {
  id: string;
  title: string;
  desc: string;
};

const LIST_DATA: HomeListItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  title: `列表项 ${i + 1}`,
  desc: `第 ${i + 1} 条数据，点击进入详情页`,
}));

// ---------- 首页顶部 Tab：列表视图 ----------

function ListTab({
  stackNavigation,
}: {
  stackNavigation: StackScreenProps<HomeStackParamList, 'Home'>['navigation'];
}) {
  return (
    <FlatList
      data={LIST_DATA}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [
            styles.listItem,
            pressed && styles.listItemPressed,
          ]}
          onPress={() =>
            stackNavigation.navigate('Detail', {
              id: item.id,
              title: item.title,
            })
          }
        >
          <Text style={styles.listItemTitle}>{item.title}</Text>
          <Text style={styles.listItemDesc}>{item.desc}</Text>
        </Pressable>
      )}
    />
  );
}

// ---------- 首页顶部 Tab：第二个视图 ----------

function ViewTab() {
  return (
    <View style={styles.topTabViewRoot}>
      <Text style={styles.topTabViewTitle}>第二个视图</Text>
      <Text style={styles.topTabViewDesc}>左右滑动或点击顶部 Tab 切换</Text>
    </View>
  );
}

function HomeScreen({
  navigation,
}: StackScreenProps<HomeStackParamList, 'Home'>) {
  return (
    <View style={styles.screen}>
      <TopTab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#1f6feb',
          tabBarInactiveTintColor: '#9aa0a6',
          tabBarLabelStyle: styles.topTabLabel,
          tabBarIndicatorStyle: styles.topTabIndicator,
          tabBarStyle: styles.topTabBar,
        }}
      >
        <TopTab.Screen name="ListTab">
          {() => <ListTab stackNavigation={navigation} />}
        </TopTab.Screen>
        <TopTab.Screen name="ViewTab" component={ViewTab} />
      </TopTab.Navigator>
    </View>
  );
}

// ---------- 详情页 ----------

function DetailScreen({
  route,
}: StackScreenProps<HomeStackParamList, 'Detail'>) {
  const { id, title } = route.params;

  return (
    <View style={styles.detailRoot}>
      <Text style={styles.detailTitle}>{title}</Text>
      <Text style={styles.detailDesc}>这是详情页，列表 id：{id}</Text>
      <Text style={styles.detailDesc}>点击左上角返回按钮回到列表</Text>
    </View>
  );
}

// ---------- Info 页 ----------

function InfoScreen() {
  return (
    <View style={styles.infoRoot}>
      <Text style={styles.infoTitle}>Info</Text>
      <Text style={styles.infoDesc}>这是 info 页面</Text>
    </View>
  );
}

// ---------- 导航 ----------

function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1f6feb' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        headerTitleAlign: 'center',
        headerShadowVisible: false,

      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        // headerShown 保持 true（使用系统 header），
        // headerTransparent 让 header 背景透明，露出页面顶部的图片
        options={{
          // 不要标题
          headerTitle: '',
          headerShown: true,
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
          headerLeft: () => <HomeHeaderLeft />,
          headerRight: () => <HomeHeaderRight />,
        }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1f6feb',
        tabBarInactiveTintColor: '#9aa0a6',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'home',
          headerShown: false,
          tabBarIcon: ({ color }) => <View style={[styles.tabIcon, { backgroundColor: color }]} />,
        }}
      />
      <Tab.Screen
        name="InfoTab"
        component={InfoScreen}
        options={{
          title: 'info',
          headerStyle: { backgroundColor: '#1f6feb' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          tabBarIcon: ({ color }) => <View style={[styles.tabIcon, { backgroundColor: color }]} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ---------- 入口 ----------

export default function App() {

  return (
    <GestureHandlerRootView style={styles.appRoot}>
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ---------- 样式 ----------

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  adRoot: {
    flex: 1,
    backgroundColor: '#0b1b3a',
  },
  adBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adOverlay: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 16,
  },
  adTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
  },
  adSubtitle: {
    marginTop: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  skipWrapper: {
    position: 'absolute',
    right: 16,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  header: {
    // 背景色（图片加载不出来时的兜底色 / 图片透明处的底色）
    backgroundColor: '#1f6feb',
    justifyContent: 'center',
  },
  headerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerIconText: {
    color: '#ffffff',
    fontSize: 14,
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerButtonPressed: {
    opacity: 0.6,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerPlusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerPlusText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
  },
  topTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'none',
  },
  topTabIndicator: {
    backgroundColor: '#1f6feb',
    height: 3,
    borderRadius: 2,
  },
  topTabBar: {
    backgroundColor: '#ffffff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  topTabViewRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topTabViewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#24292f',
  },
  topTabViewDesc: {
    marginTop: 8,
    fontSize: 14,
    color: '#57606a',
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  listItemPressed: {
    backgroundColor: '#eef3ff',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  listItemDesc: {
    marginTop: 4,
    fontSize: 13,
    color: '#8a8f98',
  },
  detailRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f5f6f8',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
  },
  detailDesc: {
    fontSize: 14,
    color: '#8a8f98',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f6f8',
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
  },
  infoDesc: {
    fontSize: 14,
    color: '#8a8f98',
  },
  tabLabel: {
    fontSize: 12,
  },
  tabIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
});
