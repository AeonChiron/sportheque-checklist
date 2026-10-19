import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, GestureResponderEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  SensorType,
  useAnimatedProps,
  useAnimatedSensor,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

// A freshly mopped gym floor, seen from straight above. The rabbit slides on
// the wet film when you tilt the phone, and leaves ripples behind him.

const APP_NAME = 'QUART GYM';
const RABBIT = require('./assets/rabbit.png');
const IMG_W = 491;
const IMG_H = 659;
// Where his feet touch the floor (fraction of the image): the pivot for leaning.
const FOOT_X = 0.52;
const FOOT_Y = 0.95;

const TILE = 58;
const RIPPLES = 18; // ripple slots: x, y, age, strength, seed
const DEG = Math.PI / 180;
const IOS = Platform.OS === 'ios';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Floor />
    </SafeAreaProvider>
  );
}

function Floor() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const charW = Math.min(170, W * 0.4);
  const charH = (charW * IMG_H) / IMG_W;
  const buttonH = 58;
  const buttonBottom = Math.max(insets.bottom, 16) + 12;
  const buttonTop = H - buttonBottom - buttonH;

  // Play area for his feet: he must stay fully on screen, clear of the status bar and button.
  const minX = charW * FOOT_X + 6;
  const maxX = W - charW * (1 - FOOT_X) - 6;
  const minY = insets.top + 12 + charH * FOOT_Y;
  const maxY = buttonTop - 18 - charH * (1 - FOOT_Y);

  const sensor = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });

  // Physics state (UI thread).
  const x = useSharedValue(W / 2);
  const y = useSharedValue((minY + maxY) / 2 + 40);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const lean = useSharedValue(0);
  const squash = useSharedValue(0); // spring value for the wall squash
  const squashV = useSharedValue(0);
  const squashAxis = useSharedValue(0); // 0 = horizontal wall hit, 1 = vertical
  const t = useSharedValue(0);
  const basePitch = useSharedValue(NaN);
  const baseRoll = useSharedValue(NaN);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const emit = useSharedValue(0);
  const ripples = useSharedValue<number[]>(new Array(RIPPLES * 5).fill(0).map((_, i) => (i % 5 === 2 ? 99 : 0)));
  const nextSlot = useSharedValue(0);
  // Press and hold the water (for testing on a computer): drift toward the finger.
  const holding = useSharedValue(0);
  const holdX = useSharedValue(0);
  const holdY = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    t.value += dt;

    // --- Tilt from pitch and roll (not raw numbers), relative to how the phone is held.
    let { x: gx, y: gy, z: gz } = sensor.sensor.value;
    if (IOS) { gx = -gx; gy = -gy; gz = -gz; } // iOS reports the opposite direction
    const pitch = Math.atan2(gy, gz); // tipping the top away / toward you
    const roll = Math.atan2(gx, Math.sqrt(gy * gy + gz * gz)); // left / right
    if (Number.isNaN(basePitch.value) && (gx || gy || gz)) { basePitch.value = pitch; baseRoll.value = roll; }
    if (!Number.isNaN(basePitch.value)) {
      // "Level" slowly follows the hand (about 10 s), so it re-levels by itself.
      const k = Math.min(1, dt / 10);
      let dp = pitch - basePitch.value;
      if (dp > Math.PI) dp -= 2 * Math.PI;
      if (dp < -Math.PI) dp += 2 * Math.PI;
      basePitch.value += dp * k;
      baseRoll.value += (roll - baseRoll.value) * k;
      // Ignore small wobble (3°), then ease in.
      const shape = (d: number) => {
        const m = Math.abs(d) - 3 * DEG;
        if (m <= 0) return 0;
        const e = Math.min(1, m / (25 * DEG));
        return Math.sign(d) * e * e * (3 - 2 * e); // smoothstep: gentle near level
      };
      const targetX = -shape(roll - baseRoll.value);
      const targetY = shape(dp);
      tiltX.value += (targetX - tiltX.value) * Math.min(1, dt * 8);
      tiltY.value += (targetY - tiltY.value) * Math.min(1, dt * 8);
    }

    // --- Forces: tilt pushes him downhill; press-and-hold pulls him toward the finger.
    const A = 1500;
    let ax = tiltX.value * A;
    let ay = tiltY.value * A;
    if (holding.value) {
      const dx = holdX.value - x.value, dy = holdY.value - y.value;
      const d = Math.max(1, Math.hypot(dx, dy));
      const pull = Math.min(1, d / 140) * 900;
      ax += (dx / d) * pull;
      ay += (dy / d) * pull;
    }
    // Water drag: speeds up smoothly, coasts to a stop. No tilt = no movement.
    const drag = Math.exp(-1.7 * dt);
    vx.value = (vx.value + ax * dt) * drag;
    vy.value = (vy.value + ay * dt) * drag;
    if (Math.abs(vx.value) < 0.5 && ax === 0) vx.value = 0;
    if (Math.abs(vy.value) < 0.5 && ay === 0) vy.value = 0;
    x.value += vx.value * dt;
    y.value += vy.value * dt;

    // --- Soft bounces off all four edges; a hard hit squashes him a little (≈5%).
    const hit = (speed: number, axis: number) => {
      if (speed > 220) {
        squashAxis.value = axis;
        squashV.value = -Math.min(1, speed / 900) * 0.65; // peaks near 5%
      }
    };
    const REST = 0.42;
    if (x.value < minX) { hit(Math.abs(vx.value), 0); x.value = minX; vx.value = Math.abs(vx.value) * REST; }
    if (x.value > maxX) { hit(Math.abs(vx.value), 0); x.value = maxX; vx.value = -Math.abs(vx.value) * REST; }
    if (y.value < minY) { hit(Math.abs(vy.value), 1); y.value = minY; vy.value = Math.abs(vy.value) * REST; }
    if (y.value > maxY) { hit(Math.abs(vy.value), 1); y.value = maxY; vy.value = -Math.abs(vy.value) * REST; }
    // Squash spring: wobbles back to normal.
    squashV.value += (-170 * squash.value - 9 * squashV.value) * dt;
    squash.value += squashV.value * dt;

    // --- Lean like a boat turning (never more than 30°, never spins).
    const target = Math.max(-30, Math.min(30, vx.value * 0.06));
    lean.value += (target - lean.value) * Math.min(1, dt * 5);

    // --- Ripples only while moving: faster = more and stronger, dropped just behind him.
    const speed = Math.hypot(vx.value, vy.value);
    const arr = ripples.value.slice();
    for (let i = 0; i < RIPPLES; i++) arr[i * 5 + 2] += dt;
    if (speed > 18) {
      emit.value += dt * Math.min(14, speed / 45);
      while (emit.value >= 1) {
        emit.value -= 1;
        const s = nextSlot.value;
        nextSlot.value = (s + 1) % RIPPLES;
        const back = 16 / Math.max(1, speed);
        arr[s * 5] = x.value - vx.value * back * 1.2 + (Math.random() - 0.5) * 10;
        arr[s * 5 + 1] = y.value - vy.value * back * 1.2 - 4 + (Math.random() - 0.5) * 6;
        arr[s * 5 + 2] = 0;
        arr[s * 5 + 3] = Math.min(1, 0.25 + speed / 500);
        arr[s * 5 + 4] = Math.random() * 6.28;
      }
    } else emit.value = 0;
    ripples.value = arr;
  });

  // --- The rabbit: position, lean around his feet, squash, gentle bob in place.
  const charStyle = useAnimatedStyle(() => {
    const bob = Math.sin(t.value * 2.2) * 1.6;
    const sq = Math.max(-0.06, Math.min(0.06, squash.value)); // flattened against the wall, then wobbles back
    const sx = 1 + (squashAxis.value === 0 ? sq : -sq * 0.6);
    const sy = 1 + (squashAxis.value === 1 ? sq : -sq * 0.6);
    return {
      transform: [
        { translateX: x.value - charW * FOOT_X },
        { translateY: y.value - charH * FOOT_Y + bob },
        { rotate: `${lean.value + Math.sin(t.value * 1.4) * 1.2}deg` },
        { scaleX: sx },
        { scaleY: sy },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - charW * 0.5 + 14 }, { translateY: y.value - 14 + 10 }, { scale: 1 - Math.sin(t.value * 2.2) * 0.02 }],
  }));
  const foamStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - charW * 0.36 }, { translateY: y.value - 9 }, { rotate: `${lean.value * 0.15}deg` }, { scale: 1 + Math.sin(t.value * 3) * 0.03 }],
  }));

  // --- Wobbly grout lines (seen through the water film) and drifting light.
  const grout = useAnimatedProps(() => {
    const tt = t.value;
    let d = '';
    for (let gx0 = ((W % TILE) / 2); gx0 <= W; gx0 += TILE) {
      for (let yy = -10; yy <= H + 10; yy += 26) {
        const ox = 2.2 * Math.sin(yy * 0.025 + tt * 1.1 + gx0 * 0.01) + 1.2 * Math.sin(yy * 0.06 - tt * 0.7);
        d += `${yy === -10 ? 'M' : 'L'}${(gx0 + ox).toFixed(1)} ${yy}`;
      }
    }
    for (let gy0 = 0; gy0 <= H; gy0 += TILE) {
      for (let xx = -10; xx <= W + 10; xx += 26) {
        const oy = 2.2 * Math.sin(xx * 0.022 - tt * 0.9 + gy0 * 0.012) + 1.2 * Math.sin(xx * 0.05 + tt * 0.6);
        d += `${xx === -10 ? 'M' : 'L'}${xx} ${(gy0 + oy).toFixed(1)}`;
      }
    }
    return { d };
  });
  const lightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(t.value * 0.08) * W * 0.25 }, { translateY: Math.cos(t.value * 0.06) * 40 }],
  }));

  // --- Ripple rings: a slightly wobbly ring with a thin bright edge and a darker band inside.
  const ring = (i: number, band: boolean) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedProps(() => {
      const a = ripples.value;
      const age = a[i * 5 + 2];
      const life = 1.5;
      if (age >= life) return { d: 'M0 0', strokeOpacity: 0 };
      const cx = a[i * 5], cy = a[i * 5 + 1], str = a[i * 5 + 3], seed = a[i * 5 + 4];
      const r = (14 + 70 * str) * (1 - Math.exp(-age * 3.2)) + 4 - (band ? 4 : 0); // fast, then slower
      if (r <= 1) return { d: 'M0 0', strokeOpacity: 0 };
      let d = '';
      for (let k = 0; k <= 28; k++) {
        const th = (k / 28) * Math.PI * 2;
        const rr = r * (1 + 0.035 * Math.sin(th * 3 + seed + age * 2) + 0.02 * Math.sin(th * 5 - seed));
        d += `${k ? 'L' : 'M'}${(cx + Math.cos(th) * rr).toFixed(1)} ${(cy + Math.sin(th) * rr).toFixed(1)}`;
      }
      const fade = (1 - age / life) * str;
      return { d: `${d}Z`, strokeOpacity: band ? fade * 0.28 : fade * 0.85 };
    });
  const ringProps = Array.from({ length: RIPPLES }, (_, i) => [ring(i, true), ring(i, false)]);

  // Touch: press and hold the floor to pull him toward your finger.
  const onTouch = (e: GestureResponderEvent) => {
    holdX.value = e.nativeEvent.locationX;
    holdY.value = e.nativeEvent.locationY;
    holding.value = 1;
  };

  return (
    <View
      style={styles.root}
      onStartShouldSetResponder={() => true}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
      onResponderRelease={() => { holding.value = 0; }}
      onResponderTerminate={() => { holding.value = 0; }}
    >
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Bright blue sport floor, a little deeper toward the bottom. */}
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#47a8ea" />
            <Stop offset="1" stopColor="#2a80c8" />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#floor)" />
        {/* The name painted on the floor, like a court marking, under the tiles and the wet film. */}
        <Ellipse cx={W / 2} cy={H * 0.48} rx={W * 0.42} ry={W * 0.42} fill="none" stroke="#0b3a74" strokeOpacity={0.18} strokeWidth={10} />
        <SvgText x={W / 2} y={H * 0.48 + W * 0.055} textAnchor="middle" fontSize={W * 0.15} fontWeight="900" fill="#0b3a74" fillOpacity={0.22} letterSpacing={2}>
          {APP_NAME}
        </SvgText>
        {/* Rubber floor tile seams, wobbling through the water film. */}
        <AnimatedPath animatedProps={grout} stroke="#ffffff" strokeOpacity={0.14} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <AnimatedPath animatedProps={grout} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {/* Soft streaks of light from the gym lights, drifting slowly on the wet floor. */}
      <Animated.View pointerEvents="none" style={[styles.abs, { width: W, height: H }, lightStyle]}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <G rotation={-28} origin={`${W / 2}, ${H / 2}`}>
            <Rect x={-W * 0.6} y={H * 0.18} width={W * 2.2} height={46} fill="url(#sheen)" />
            <Rect x={-W * 0.6} y={H * 0.46} width={W * 2.2} height={90} fill="url(#sheen)" opacity={0.7} />
            <Rect x={-W * 0.6} y={H * 0.74} width={W * 2.2} height={34} fill="url(#sheen)" />
          </G>
        </Svg>
      </Animated.View>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Ripples left in the wet film. */}
        {ringProps.map(([band, edge], i) => (
          <G key={i}>
            <AnimatedPath animatedProps={band} stroke="#0b3a74" strokeWidth={5} fill="none" />
            <AnimatedPath animatedProps={edge} stroke="#ffffff" strokeWidth={1.4} fill="none" />
          </G>
        ))}
      </Svg>

      {/* His shadow on the floor, a little down and to the right. */}
      <Animated.View pointerEvents="none" style={[styles.abs, shadowStyle]}>
        <Svg width={charW} height={28}>
          <Defs>
            <RadialGradient id="sh" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#06264f" stopOpacity="0.38" />
              <Stop offset="1" stopColor="#06264f" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={charW / 2} cy={14} rx={charW / 2} ry={14} fill="url(#sh)" />
        </Svg>
      </Animated.View>
      {/* A thin white wet line around his feet where they touch the water. */}
      <Animated.View pointerEvents="none" style={[styles.abs, styles.foam, { width: charW * 0.72, height: 18, borderRadius: 9 }, foamStyle]} />

      <Animated.Image
        source={RABBIT}
        pointerEvents="none"
        style={[styles.abs, { width: charW, height: charH, transformOrigin: [charW * FOOT_X, charH * FOOT_Y, 0] }, charStyle]}
      />

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, { bottom: buttonBottom, height: buttonH, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={() => {}}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2a80c8', overflow: 'hidden' },
  abs: { position: 'absolute', left: 0, top: 0 },
  foam: { borderWidth: 1.6, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.08)' },
  button: {
    position: 'absolute', left: 20, right: 20, borderRadius: 999, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#06264f', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  buttonText: { fontSize: 18, fontWeight: '700', color: '#0b2a4f' },
});
