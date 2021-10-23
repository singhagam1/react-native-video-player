import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  centerInView: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
    elevation: 5,
  },
  mediaControlsView: {
    height: 40,
    backgroundColor: 'rgba(0,0,0,.3)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    flex: 1,
  },
  mediaControlIconsCenterStyle: {width: 44, height: 44, tintColor: '#fff'},
  mediaControlIconsStyle: {width: 22, height: 22, tintColor: '#fff'},
  mediaControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowWithAlignCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaControlsInnerContainer: {
    flex: 0.9,
    justifyContent: 'center',
    marginLeft: 32,
  },
});

export default styles;
