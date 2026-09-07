import * as React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const FirstRoute = () => (
  <View style={{ flex: 1, backgroundColor: '#ff4081' }} />
);

const SecondRoute = () => (
  <View style={{ flex: 1, backgroundColor: '#673ab7' }} />
);

const routes = [
  { key: 'first', title: 'First' },
  { key: 'second', title: 'Second' },
];

export default function App() {
  const pagerRef = React.useRef<PagerView>(null);
  const [index, setIndex] = React.useState(0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.tabBar}>
          {routes.map((route, i) => {
            const active = i === index;
            return (
              <Pressable
                key={route.key}
                style={styles.tabItem}
                onPress={() => pagerRef.current?.setPage(i)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {route.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <PagerView
          scrollEnabled={false}
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(e) => setIndex(e.nativeEvent.position)}
        >
          <View key="first" style={{ flex: 1 }}>
            <FirstRoute />
          </View>
          <View key="second" style={{ flex: 1 }}>
            <SecondRoute />
          </View>
        </PagerView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    color: '#666',
  },
  tabLabelActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  pager: {
    flex: 1,
  },
});
