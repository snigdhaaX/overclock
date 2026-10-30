import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingSlide from '../../components/OnboardingSlide';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import Colors from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';

const SLIDES = [0, 1, 2];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(
    Math.min(Dimensions.get('window').width, 412)
  );
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / containerWidth);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push('/(public)/signin');
    }
  };

  const handleSkip = () => {
    router.push('/(public)/signin');
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 2) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Horizontal Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          getItemLayout={(_, index) => ({
            length: containerWidth,
            offset: containerWidth * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={{ width: containerWidth }}>
              <OnboardingSlide index={item} slideWidth={containerWidth} />
            </View>
          )}
        />
      </View>

      {/* Footer Controls matching reference screens */}
      <View style={styles.footerContainer}>
        {currentIndex < 2 ? (
          <View style={styles.navRow}>
            {/* Skip Button */}
            <Pressable
              onPress={handleSkip}
              hitSlop={10}
              style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    currentIndex === i ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            {/* Next Button */}
            <Pressable
              onPress={handleNext}
              hitSlop={8}
              style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
            >
              <Text style={styles.nextText}>Next</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.finalCtaContainer}>
            {/* Pagination Dots */}
            <View style={[styles.paginationDots, { marginBottom: Spacing.md }]}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    currentIndex === i ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            {/* Full-width Get Started CTA */}
            <PrimaryButton
              title="Get Started"
              onPress={() => router.push('/(public)/signin')}
              size="lg"
              style={styles.fullWidthButton}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  footerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
  skipButtonPressed: {
    backgroundColor: Colors.lightBlue,
  },
  skipText: {
    ...Typography.button,
    fontSize: 15,
    color: '#94A3B8',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  nextText: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.white,
    fontWeight: '600',
  },
  finalCtaContainer: {
    width: '100%',
    alignItems: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
});
