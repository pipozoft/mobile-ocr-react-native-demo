/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {runOnJS} from 'react-native-reanimated';
import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  Alert,
  Button,
  LayoutChangeEvent,
  PixelRatio,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import TextRecognition, { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

import {
  useCameraDevices,
  useFrameProcessor,
  Camera,
  Frame,
} from 'react-native-vision-camera';
import {frameToBase64} from 'vision-camera-base64';

const CREDIT_CARD_REGEX = /\b(?:\d[ -]*){13,16}\b/;

const findCardNumberInResult = (result: TextRecognitionResult): string => {
  const match = result.text.match(CREDIT_CARD_REGEX);
  return match ? match[0] : '';
};

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = React.useState(false);
  const [showCamera, setShowCamera] = React.useState(false);
  const [pixelRatio, setPixelRatio] = React.useState<number>(1);
  const [creditCardNumber, setCreditCardNumber] = React.useState<string>();

  const devices = useCameraDevices();
  const device = devices.back;

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const check = async (imageBase64Data: string) => {
    const result = await TextRecognition.recognize(
      `data:image/jpeg;base64,${imageBase64Data}`,
    );

    const creditCardNumberDetected = findCardNumberInResult(result)
    
    if (creditCardNumberDetected.length) {
      console.log('---------');
      console.log(creditCardNumberDetected);
      console.log('---------');
      setShowCamera(false);
    }
    setCreditCardNumber(creditCardNumberDetected);
  };

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    const image = frameToBase64(frame);
    runOnJS(check)(image);
  }, [check]);

  const openCamera = async () => {
    const status = await Camera.requestCameraPermission();
    const isAuthorized = status === 'authorized';
    setHasPermission(isAuthorized);

    if (isAuthorized) {
      setShowCamera(true);
    }

    if (!(isAuthorized && device)) {
      Alert.alert(
        'No Cameras Detected',
        'It looks like your device doesnt have any cameras.',
        [{text: 'OK', onPress: () => console.log('OK Pressed')}],
      );
    }
  };

  const renderOverlay = () => {
    return (
      <SafeAreaView>
        <Text>Ok!</Text>
      </SafeAreaView>
    );
  };

  return (
    <>
      {showCamera && device && hasPermission && (
        <>
          <Camera
            style={[StyleSheet.absoluteFill]}
            frameProcessor={frameProcessor}
            device={device}
            isActive={true}
            frameProcessorFps={5}
            onLayout={(event: LayoutChangeEvent) => {
              setPixelRatio(
                event.nativeEvent.layout.width /
                  PixelRatio.getPixelSizeForLayoutSize(
                    event.nativeEvent.layout.width,
                  ),
              );
            }}
          />
          {renderOverlay()}
        </>
      )}

      {!showCamera && (
        <SafeAreaView style={backgroundStyle}>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={backgroundStyle.backgroundColor}
          />
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={backgroundStyle}>
            <View
              style={{
                backgroundColor: isDarkMode ? Colors.black : Colors.white,
              }}>
              <Button onPress={openCamera} title="Scan Card"></Button>

              <View>
                <Text style={styles.number}>{creditCardNumber}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  number: {
    fontSize: 24,
    color: '#fff'
  }
});

export default App;
