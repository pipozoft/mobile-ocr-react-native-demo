/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {runOnJS} from 'react-native-reanimated';
import React from 'react';
import {
  Alert,
  Button,
  LayoutChangeEvent,
  PixelRatio,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import TextRecognition, {
  TextRecognitionResult,
} from '@react-native-ml-kit/text-recognition';

import {
  useCameraDevices,
  useFrameProcessor,
  Camera,
  Frame,
} from 'react-native-vision-camera';
import {frameToBase64} from 'vision-camera-base64';

interface CreditCardData {
  number?: string;
  expirationDate?: {
    month: string;
    year: string;
  };
  sequenceNumber?: string;
  cvv?: string;
}

const CREDIT_CARD_NUMBER_REGEX = /\b(?:\d[ -]*){13,16}\b/;
const SQUENCE_NUMBER_REGEX = /A\d{3}/;
const EXPIRATION_DATE_REGEX = /(0[1-9]|1[0-2])\/([0-9]{2})/g;
const CVV_REGEX = /\n(\d{3})\n/;

type Detection = 'discover' | 'other';

const findCardNumberInResult = (
  result: TextRecognitionResult,
): string | null => {
  const match = result.text.match(CREDIT_CARD_NUMBER_REGEX);
  return match ? match[0] : null;
};

const findSquenceNumberInResult = (
  result: TextRecognitionResult,
): string | null => {
  const match = result.text.match(SQUENCE_NUMBER_REGEX);
  return match ? match[0] : null;
};

const findExpirationDateInResult = (
  result: TextRecognitionResult,
): string | null => {
  const match = result.text.match(EXPIRATION_DATE_REGEX);
  return match ? match[0] : null;
};

const findCVVInResult = (result: TextRecognitionResult): string | null => {
  const match = result.text.match(CVV_REGEX);
  return match ? match[0] : null;
};

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = React.useState(false);
  const [showCamera, setShowCamera] = React.useState(false);
  const [pixelRatio, setPixelRatio] = React.useState<number>(1);
  const [detectionType, setDetectionType] = React.useState<Detection>();
  const [creditCardData, setCreditCardData] = React.useState<CreditCardData>();

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

    console.log('----ALL BLOCK-----');
    console.log(result.text);

    const creditCardNumberDetected = findCardNumberInResult(result);
    const sequenceNumberDetected = findSquenceNumberInResult(result);
    const expirationDateDetected = findExpirationDateInResult(result);
    const cvvDetected = findCVVInResult(result);

    const condition =
      detectionType === 'discover'
        ? creditCardNumberDetected &&
          sequenceNumberDetected &&
          expirationDateDetected &&
          cvvDetected
        : creditCardNumberDetected;

    if (condition) {
      console.log('----NUMBER-----');
      console.log(creditCardNumberDetected);
      console.log('-----SEQUENCE----');
      console.log(sequenceNumberDetected);
      console.log('----EXP DATE-----');
      console.log(expirationDateDetected);
      console.log('----CVV-----');
      console.log(cvvDetected);
      setShowCamera(false);

      const [month, year] = expirationDateDetected ? expirationDateDetected.split('/') : ['', ''];

      setCreditCardData(_data => {
        return {
          ..._data,
          sequenceNumber: sequenceNumberDetected!,
          number: creditCardNumberDetected!,
          expirationDate: {
            month,
            year,
          },
          cvv: cvvDetected!,
        };
      });
    }
  };

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const image = frameToBase64(frame);
      runOnJS(check)(image);
    },
    [check],
  );

  const openCamera = async (type: Detection) => {
    const status = await Camera.requestCameraPermission();
    const isAuthorized = status === 'authorized';
    setHasPermission(isAuthorized);

    if (isAuthorized) {
      setDetectionType(type);
      setShowCamera(true);
      reset();
    }

    if (!(isAuthorized && device)) {
      Alert.alert(
        'No Cameras Detected',
        'It looks like your device doesnt have any cameras.',
        [{text: 'OK', onPress: () => console.log('OK Pressed')}],
      );
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  const reset = () => {
    setCreditCardData(undefined);
  };

  const Overlay = () => {
    return (
      <SafeAreaView style={{flex: 1}}>
        <View
          style={{
            height: '100%',
          }}>
          <View
            style={{
              height: '95%',
              alignItems: 'center',
            }}>
            <View style={styles.camera}></View>
          </View>
          <View
            style={{
              flex: 1,
              height: '5%',
              alignItems: 'center',
            }}>
            <View style={styles.closeButton}>
              <Button color="white" onPress={closeCamera} title="⨉"></Button>
            </View>
          </View>
        </View>
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
          <Overlay />
        </>
      )}

      {!showCamera && (
        <SafeAreaView style={{...backgroundStyle, flex: 1}}>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={backgroundStyle.backgroundColor}
          />
          <View
            style={{
              ...styles.view,
              justifyContent: creditCardData ? 'space-between' : 'flex-end',
              backgroundColor: isDarkMode ? Colors.black : Colors.white,
            }}>
            {creditCardData && (
              <View style={styles.card}>
                {creditCardData?.expirationDate?.month && (
                  <Text style={styles.data}>
                    {creditCardData?.expirationDate?.month}/
                    {creditCardData?.expirationDate?.year}
                  </Text>
                )}

                {creditCardData?.number && (
                  <Text style={styles.data}>{creditCardData?.number}</Text>
                )}

                {creditCardData?.cvv && (
                  <Text style={styles.data}>
                    {parseInt(creditCardData?.cvv)}
                  </Text>
                )}

                {creditCardData?.sequenceNumber && (
                  <Text style={styles.data}>
                    {creditCardData?.sequenceNumber}
                  </Text>
                )}
              </View>
            )}

            <View>
              <View style={styles.discoverButton}>
                <Button
                  color="white"
                  onPress={() => openCamera('discover')}
                  title="Scan Discover Card"></Button>
              </View>
              <View style={styles.otherButton}>
                <Button
                  color="white"
                  onPress={() => openCamera('other')}
                  title="Scan Other Card"></Button>
              </View>
              <Button color="white" onPress={reset} title="Reset"></Button>
            </View>
          </View>
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
    paddingVertical: 24,
    alignItems: 'center',
  },
  data: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 12,
    lineHeight: 32,
  },
  card: {
    padding: 24,
    borderColor: '#ff6000',
    borderWidth: 1,
    margin: 12,
    borderRadius: 12,
    aspectRatio: 1.5,
    height: 240,
    backgroundColor: '#444',
  },
  camera: {
    padding: 24,
    borderColor: '#ff6000',
    borderWidth: 1,
    margin: 12,
    borderRadius: 12,
    height: 240,
    aspectRatio: 1.5,
  },
  discoverButton: {
    backgroundColor: '#ff6000',
    margin: 12,
    borderRadius: 24,
    paddingHorizontal: 24,
  },
  otherButton: {
    backgroundColor: '#23233f',
    margin: 12,
    borderRadius: 24,
    paddingHorizontal: 24,
  },
  closeButton: {
    backgroundColor: '#ff6000',
    borderRadius: 48,
    width: 32,
    height: 32,
  },
});

export default App;
