import * as Sharing from 'expo-sharing';
import { RefObject } from 'react';
import { Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

type ShareImageOptions = {
  fallbackMessage: string;
  title: string;
};

export async function shareViewAsImage(viewRef: RefObject<View | null>, options: ShareImageOptions) {
  if (!viewRef.current) {
    await Share.share({ message: options.fallbackMessage, title: options.title });
    return;
  }

  const imageUri = await captureRef(viewRef.current, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(imageUri, {
      dialogTitle: options.title,
      mimeType: 'image/png',
      UTI: 'public.png',
    });
    return;
  }

  await Share.share({ message: options.fallbackMessage, title: options.title, url: imageUri });
}
