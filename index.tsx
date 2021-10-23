import React, {RefObject, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  GestureResponderEvent,
  ImageURISource,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import Video, {
  LoadError,
  OnBufferData,
  OnLoadData,
  OnProgressData,
} from 'react-native-video';
import {Slider} from '@miblanchard/react-native-slider';
import Orientation from 'react-native-orientation';
import SystemSetting from 'react-native-system-setting';
import {useFocusEffect} from '@react-navigation/core';
import {Immersive} from 'react-native-immersive';
import DeviceInfo from 'react-native-device-info';
import styles from './styles';
import {
  audio,
  exitFullscreen,
  forward,
  fullScreen,
  mute,
  pause,
  play,
  retry,
  rewind,
} from './images';

const {width} = Dimensions.get('screen');

/**
 * @description Custom Video Player component
 * @param {string | number} src - source of the video file for the video player
 * @param {ImageURISource | number} playIconPath - path of the custom play icon
 * @param {ImageURISource | number} pauseIconPath - path of the custom pause icon
 * @param {ImageURISource | number} muteIconPath - path of the custom mute icon
 * @param {ImageURISource | number} audioIconPath - path of the custom unmute icon
 * @param {boolean} controls - pass true to enable media controls or false to disable media controls
 * @param {boolean} autoplay - default is true, pass false to pause to video when screen is opened for the first time
 * @param {number} height - default is 400, pass any number to set the height of the video player
 * @param {number} seekBarThumbSize - pass the custom size of the seekbar thumb, default is 18
 * @param {string} seekBarThumbColor - pass the custom color for the seekbar thumb, default is #fff
 * @param {string} loaderColor - pass the custom color for the video player loader, default is #0095ff
 * @param {boolean} wantFullScreen - pass true to enable fullscreen button or false to hide/disable full screen button, default is true
 * @param {styles} textStyle - pass text style for video play time and duration time
 * @param {Ref} rootElementRef - pass the reference of the root element
 * @param {string} rootViewBgColor - pass the background color of the root element of the current screen
 * @param {boolean} forwardBackwardButtons - if true both forward and backward buttons are visible, otherwise hidden
 * @param {ImageURISource | number} forward10secsImagePath - pass the path of the forward 10secs icon
 * @param {ImageURISource | number} backward10secsImagePath - pass the path of the rewind 10secs icon
 * @param {string} thumbnailPath - paas the string path of the thumbnail
 * @param {RefObject} scrollViewRef - pass the reference of the scrollview (if any) present in the current screen
 * @param {number} androidPaddingVertical - in case of android when the player exit full screen, it still considers the space of
 *        nav buttons and status bar to be free for use, bacause of that anything at the bottom and top gets hidden. default value is
 *        48. this issue does not occur on the very first render.
 * @summary in order to make full screen work properly, make sure you pass the root element ref and scroll element ref(if any)
 */

type Props = {
  src: {uri: string} | number;
  playIconPath?: ImageURISource | number;
  pauseIconPath?: ImageURISource | number;
  muteIconPath?: ImageURISource | number;
  audioIconPath?: ImageURISource | number;
  controls?: boolean;
  autoplay?: boolean;
  height?: number;
  seekBarThumbSize?: number;
  seekBarThumbColor?: string;
  loaderColor?: string;
  wantFullScreen?: boolean;
  textStyle?: StyleProp<ViewStyle>;
  rootElementRef?: RefObject<View>;
  rootViewBgColor?: string;
  forwardBackwardButtons?: boolean;
  forward10secsImagePath?: ImageURISource | number;
  backward10secsImagePath?: ImageURISource | number;
  thumbnailPath?: string;
  scrollViewRef?: RefObject<ScrollView>;
  androidPaddingVertical?: number;
};

type VolumeStateProps = {
  isMute: boolean;
  volume: number | null;
};

type ScreenDimensionsObject = {
  screenHeight: number;
  screenWidth: number;
};

export default function VideoPlayer(props: Props) {
  const {
    autoplay,
    height,
    src,
    controls,
    playIconPath,
    pauseIconPath,
    muteIconPath,
    audioIconPath,
    wantFullScreen,
    textStyle,
    seekBarThumbColor,
    rootElementRef,
    rootViewBgColor,
    forward10secsImagePath,
    backward10secsImagePath,
    thumbnailPath,
    scrollViewRef,
    androidPaddingVertical,
  } = props;

  const forwardBackwardButtons = props.forwardBackwardButtons ?? true;
  const seekBarThumbSize: number = props.seekBarThumbSize ?? 18;
  const loaderColor: string = props.loaderColor ?? '#0095ff';

  const playerRef = useRef<Video>(null);
  const playerContainerRef = useRef<View>(null);
  const [screenDimensions, setScreenDimensions] =
    useState<ScreenDimensionsObject>({
      screenHeight: height ?? 300,
      screenWidth: width,
    });
  const [isRetry, setIsRetry] = useState(false);
  const [isStatusBarHidden, setIsStatusBarHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoplay ?? true);
  const [isVideoReady, setisVideaoReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoSeek, setVideoSeek] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [isSeekBarBusy, setIsSeekBarBusy] = useState<boolean>(false);
  const [systemVolume, setSystemVolume] = useState<number | null>(null);
  const [volumeState, setVolumeState] = useState<VolumeStateProps>({
    isMute: false,
    volume: null,
  });

  const {isMute, volume} = volumeState;
  const {screenHeight, screenWidth} = screenDimensions;

  const onVideoError = (err: LoadError) => {
    setIsRetry(true);
  };

  let hideControlsTimer = useRef<any>(null);

  useEffect(() => {
    let isActive = true;
    SystemSetting.getVolume().then(volume => {
      if (isActive) {
        setSystemVolume(volume);
        setVolumeState({...volumeState, volume: volume});
      }
    });
    const volumeListener = SystemSetting.addVolumeListener(data => {
      const volume = data.value;
      setVolumeState({...volumeState, volume: volume});
    });
    const unsubscribeDimensions = Dimensions.addEventListener('change', e => {
      const {width, height} = e.screen;
      let finalHeight = height;
      let finalWidth = width;
      if (height > width) {
        finalHeight = props.height ?? 300;
        let rootStyle: {backgroundColor: string; paddingVertical?: number} = {
          backgroundColor: rootViewBgColor ?? '#fff',
        };
        if (Platform.OS === 'android') {
          rootStyle.paddingVertical = androidPaddingVertical ?? 48;
        }
        rootElementRef?.current?.setNativeProps({
          style: rootStyle,
        });
        scrollViewRef?.current?.setNativeProps({
          scrollEnabled: true,
        });
      } else {
        //fix for the issue when screen content is less that the full screen height then video player height reduces
        scrollViewRef?.current?.setNativeProps({
          contentContainerStyle: {
            flex: 1,
          },
          scrollEnabled: false,
        });
        scrollViewRef?.current?.scrollTo({x: 0, y: 0, animated: false});
        let rootStyle: {backgroundColor: string; paddingVertical?: number} = {
          backgroundColor: rootViewBgColor ?? '#000',
        };
        if (Platform.OS === 'android') {
          rootStyle.paddingVertical = 0;
        }
        rootElementRef?.current?.setNativeProps({
          style: rootStyle,
        });
        if (DeviceInfo.hasNotch()) {
          finalWidth = width - 75;
        }
      }
      if (isActive) {
        setScreenDimensions({
          screenWidth: finalWidth,
          screenHeight: finalHeight,
        });
      }
    });

    return () => {
      isActive = false;
      SystemSetting.removeVolumeListener(volumeListener);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      unsubscribeDimensions.remove();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const getSystemVolume = async () => {
        try {
          SystemSetting.getVolume().then(volume => {
            if (isActive) {
              setVolumeState({...volumeState, volume: volume});
            }
          });
        } catch (e) {}
      };

      getSystemVolume();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handlePlayPause = () => {
    if (videoSeek === 1) {
      setVideoSeek(0);
      playerRef.current?.seek(0);
      setTimeout(() => {
        setIsPlaying(true);
      }, 100);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleFullScreen = () => {
    if (isFullScreen) {
      Immersive.off();
      setIsFullScreen(false);
      setIsStatusBarHidden(false);
      setTimeout(() => {
        Orientation.lockToPortrait();
      }, 100);
    } else {
      setIsFullScreen(true);
      Orientation.lockToLandscape();
      setIsStatusBarHidden(true);
      Immersive.on();
    }
  };

  const onProgress = (data: OnProgressData) => {
    if (isLoading) {
      setIsLoading(false);
    }
    if (!isSeekBarBusy) {
      setVideoSeek(data.currentTime / data.seekableDuration);
    }
  };

  const onEnd = () => {
    setVideoSeek(1);
    setIsPlaying(false);
  };

  let justClicked = false;
  const videoAreaClicked = () => {
    if (controls) {
      if (!justClicked) {
        justClicked = true;
        if (showControls === false) {
          setShowControls(true);
          if (hideControlsTimer.current)
            clearTimeout(hideControlsTimer.current);
          hideControlsTimer.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
        } else {
          setShowControls(false);
        }
        justClicked = false;
      }
    }
  };

  const onSeekBarChange = (val: number | number[]) => {
    if (typeof val === 'object') {
      playerRef.current?.seek(val[0] * videoDuration);
      setVideoSeek(val[0]);
    }
  };

  const onLoad = (data: OnLoadData) => {
    setVideoDuration(data.duration);
    if (playerRef.current) playerRef.current.seek(0);
  };

  const onTouchStart = (event: GestureResponderEvent) => {
    if (hideControlsTimer.current) {
      if (controls) clearTimeout(hideControlsTimer.current);
    }
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    if (controls) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const onSeekBarSlidingStart = (val: number | number[]) => {
    setIsSeekBarBusy(true);
  };

  const onSeekBarSlidingEnd = (val: number | number[]) => {
    setIsSeekBarBusy(false);
  };

  const seekForward = () => {
    let newCurrentTime = videoSeek * videoDuration + 10;
    let newCurrentSeekValue = newCurrentTime / videoDuration;
    if (newCurrentTime > videoDuration) {
      newCurrentTime = videoDuration;
      newCurrentSeekValue = videoDuration;
    }
    playerRef.current?.seek(newCurrentTime);
    setVideoSeek(newCurrentSeekValue);
  };

  const seekBackward = () => {
    let newCurrentTime = videoSeek * videoDuration - 10;
    let newCurrentSeekValue = newCurrentTime / videoDuration;
    if (newCurrentTime < 0) {
      newCurrentTime = 0;
      newCurrentSeekValue = 0;
    }
    playerRef.current?.seek(newCurrentTime);
    setVideoSeek(newCurrentSeekValue);
  };

  const toggleMuteButton = () => {
    if (!isMute) {
      setVolumeState({...volumeState, isMute: !volumeState.isMute, volume: 0});
    } else {
      setVolumeState({
        ...volumeState,
        isMute: !volumeState.isMute,
        volume: systemVolume,
      });
    }
  };

  const onReady = () => {
    setisVideaoReady(true);
    setShowControls(true);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const onBuffer = (data: OnBufferData) => {
    if (
      (data.isBuffering && !isLoading) ||
      (!data.isBuffering && isLoading && isVideoReady)
    ) {
      setIsLoading(true);
    }
  };

  const msToTime = (seconds: number) => {
    let minutes: number = Math.floor(seconds / 60),
      hours: number = Math.floor((seconds / (60 * 60)) % 24);
    let finalTime: string = '';
    if (hours > 0) {
      finalTime = (hours < 10 ? '0' + hours : hours.toString()) + ':';
    }
    if (minutes <= 0) {
      finalTime += '00:';
    } else if (minutes > 0) {
      finalTime += (minutes < 10 ? '0' + minutes : minutes.toString()) + ':';
    }
    let sec = seconds % 60;
    finalTime +=
      parseInt(sec.toFixed(0)) < 10
        ? '0' + sec.toFixed(0)
        : sec.toFixed(0).toString();
    return finalTime;
  };

  const onRetryClick = () => {
    setIsRetry(false);
  };

  if (isRetry) {
    return (
      <View
        style={{
          height: screenHeight,
          width: screenWidth,
          backgroundColor: '#000',
        }}>
        <TouchableOpacity
          style={[styles.centerInView, {marginTop: screenHeight / 2.2}]}
          onPress={onRetryClick}>
          <Image
            source={retry}
            style={{height: 64, width: 64, tintColor: '#fff'}}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    );
  } else
    return (
      <View
        ref={playerContainerRef}
        style={[
          {elevation: 1, zIndex: 2},
          isFullScreen && {position: 'absolute'},
        ]}>
        <StatusBar hidden={isStatusBarHidden} />
        {isLoading && (
          <ActivityIndicator
            size="large"
            color={loaderColor}
            style={[styles.centerInView, {marginTop: screenHeight / 2.2}]}
          />
        )}
        <TouchableWithoutFeedback onPress={videoAreaClicked} style={{}}>
          <Video
            source={src}
            ref={playerRef}
            onLoad={onLoad}
            onReadyForDisplay={onReady}
            paused={!isPlaying}
            muted={isMute}
            volume={volume ?? 0}
            onProgress={onProgress}
            onEnd={onEnd}
            bufferConfig={{
              minBufferMs: 1500,
              maxBufferMs: 2000,
              bufferForPlaybackMs: 1200,
              bufferForPlaybackAfterRebufferMs: 1200,
            }}
            onBuffer={onBuffer}
            onError={onVideoError}
            mixWithOthers="duck"
            resizeMode="stretch"
            style={{
              width: screenWidth,
              height: screenHeight,
            }}
            poster={thumbnailPath}
            posterResizeMode="cover"
          />
        </TouchableWithoutFeedback>
        {controls && showControls && (
          <>
            <View
              style={{
                position: 'absolute',
                alignSelf: 'center',
                top: screenHeight / 2.2,
              }}>
              <View style={{flexDirection: 'row'}}>
                {forwardBackwardButtons && (
                  <TouchableOpacity onPress={seekBackward}>
                    <Image
                      source={backward10secsImagePath ?? rewind}
                      style={styles.mediaControlIconsCenterStyle}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handlePlayPause}
                  style={{marginHorizontal: 32, elevation: 6, zIndex: 3}}>
                  {isPlaying ? (
                    <Image
                      source={pauseIconPath ?? pause}
                      style={styles.mediaControlIconsCenterStyle}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={playIconPath ?? play}
                      style={styles.mediaControlIconsCenterStyle}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>
                {forwardBackwardButtons && (
                  <TouchableOpacity onPress={seekForward}>
                    <Image
                      source={forward10secsImagePath ?? forward}
                      style={styles.mediaControlIconsCenterStyle}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View
              style={[
                styles.mediaControlsView,
                Platform.OS === 'ios' &&
                  isFullScreen && {height: 60, marginRight: 16},
                Platform.OS === 'android' && isFullScreen && {right: 104},
              ]}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}>
              <View style={styles.rowWithAlignCenter}>
                <Text style={textStyle ?? {color: '#fff'}}>
                  {msToTime(videoSeek * videoDuration)}
                </Text>
                <Slider
                  value={videoSeek}
                  minimumTrackTintColor={'#fff'}
                  maximumTrackTintColor={'rgba(255,255,255,0.6)'}
                  onValueChange={onSeekBarChange}
                  onSlidingStart={onSeekBarSlidingStart}
                  onSlidingComplete={onSeekBarSlidingEnd}
                  thumbTintColor={seekBarThumbColor ?? '#fff'}
                  thumbStyle={{
                    width: seekBarThumbSize,
                    height: seekBarThumbSize,
                    borderRadius: seekBarThumbSize / 2,
                  }}
                  containerStyle={{
                    flex: 1,
                    marginHorizontal: 8,
                  }}
                />
                <TouchableOpacity
                  onPress={toggleMuteButton}
                  style={{marginRight: 8}}>
                  {isMute ? (
                    <Image
                      source={muteIconPath ?? mute}
                      style={styles.mediaControlIconsStyle}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={audioIconPath ?? audio}
                      style={styles.mediaControlIconsStyle}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>
                <Text style={textStyle ?? {marginRight: 12, color: '#fff'}}>
                  {msToTime(videoDuration)}
                </Text>
                {(wantFullScreen ?? true) && (
                  <TouchableOpacity onPress={handleFullScreen}>
                    {isFullScreen ? (
                      <Image
                        source={exitFullscreen}
                        style={styles.mediaControlIconsStyle}
                      />
                    ) : (
                      <Image
                        source={fullScreen}
                        style={styles.mediaControlIconsStyle}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    );
}
