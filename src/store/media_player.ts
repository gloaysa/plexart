// @ts-ignore
import XMLParser from "react-xml-parser";
import { Lyrics, MediaPlayer, MetadataFlat, MetadataWithChildren, Queue } from "./media-player.type";
import { mediaPlayerHeaders } from "./utils/getHeaders";

export async function sendPlayBackCommand(mediaPlayer: MediaPlayer, action: string): Promise<void> {
  const response = await fetch(`${mediaPlayer.uri}/player/playback/${action}`, {
    headers: mediaPlayerHeaders(mediaPlayer),
    method: "GET",
  });
  if (!response.ok) {
    console.error("Error sending playback command", response);
    throw new Error(`Error sending playback action: ${action}`);
  }
}

export async function setParameterCommand(mediaPlayer: MediaPlayer, params: string): Promise<void> {
  const response = await fetch(`${mediaPlayer.uri}/player/playback/setParameters?${params}`, {
    headers: mediaPlayerHeaders(mediaPlayer),
    method: "GET",
  });
  if (!response.ok) {
    console.error("Error sending parameter command", response);
    throw new Error(`Error sending parameter command: ${params}`);
  }
}

export async function updateMediaPlayer(mediaPlayer: MediaPlayer, commandId: number): Promise<MediaPlayer> {
  try {
    const baseUrl = `${mediaPlayer.uri}/player/timeline/poll?commandID=${commandId}`;
    const response = await fetch(`${baseUrl}&includeMetadata=1&type=music`, {
      headers: mediaPlayerHeaders(mediaPlayer),
      method: "GET",
    });
    const data = await response.text();
    const json = new XMLParser().parseFromString(data, "application/xml");
    const timeline = json.children.find((child: any) => child.attributes.type === "music");
    mediaPlayer = {
      ...mediaPlayer,
      ...timeline.attributes,
      volume_level: Number(timeline.attributes.volume ?? 0),
      is_volume_muted: timeline.attributes.muted === "1",
      playQueueItemID: Number(timeline.attributes.playQueueItemID ?? 0),
    };

    const queueData = await getPlayQueues(mediaPlayer);
    if (queueData) {
      const currentlyPlaying = queueData.Metadata.find(
        (metadata) => metadata.playQueueItemID === mediaPlayer.playQueueItemID,
      );
      if (!currentlyPlaying) {
        return mediaPlayer;
      }
      const isTidal = currentlyPlaying.attribution === "com.tidal";
      let thumbUrl = isTidal ? currentlyPlaying?.parentThumb : currentlyPlaying?.thumb;
      const thumbSize = "width=1080&height=1080";
      const thumbParameters = `url=${thumbUrl}&quality=90&format=png&X-Plex-Token=${mediaPlayer.token}`;
      // TODO: this is ultra hacky, need to find where in the data the provider is
      let thumb = isTidal
        ? `https://images.plex.tv/photo/?url=${thumbUrl}`
        : `https://${mediaPlayer.address}:${mediaPlayer.port}/photo/:/transcode?${thumbSize}&${thumbParameters}`;
      mediaPlayer.metadata = {
        ...flattenMetadata(currentlyPlaying),
        thumb,
      };
      mediaPlayer.queue = queueData;
    }
    return mediaPlayer;
  } catch (e: any) {
    return mediaPlayer;
  }
}

const flattenMetadata = (metadata: MetadataWithChildren): MetadataFlat => {
  const media = metadata.Media[0];
  const part = media.Part[0];
  const stream = part.Stream.find((stream) => !!stream.key) ?? part.Stream[0];

  return {
    ...metadata,
    Media: {
      ...media,
      Part: {
        ...part,
        Stream: {
          ...stream,
        },
      },
    },
  };
};

const getPlayQueues = async (mediaPlayer: MediaPlayer): Promise<Queue | undefined> => {
  if (!mediaPlayer.containerKey) {
    return undefined;
  }
  const response = await fetch(`https://${mediaPlayer.address}:${mediaPlayer.port}${mediaPlayer.containerKey}`, {
    headers: mediaPlayerHeaders(mediaPlayer),
    method: "GET",
  });
  if (response.ok) {
    const data = await response.json();
    return data.MediaContainer;
  }
};

export const getLyrics = async (mediaPlayer: MediaPlayer): Promise<Lyrics | undefined> => {
  if (!mediaPlayer.metadata?.Media.Part.Stream?.key) {
    return undefined;
  }
  const baseUrl = `https://${mediaPlayer.address}:${mediaPlayer.port}${mediaPlayer.metadata?.Media.Part.Stream?.key}`;
  const response = await fetch(baseUrl, {
    headers: mediaPlayerHeaders(mediaPlayer),
    method: "GET",
  });
  if (response.ok) {
    const data = await response.json();
    if (Object.keys(data.MediaContainer.Lyrics?.[0]).length === 0) {
      return undefined;
    }
    return data.MediaContainer.Lyrics[0];
  }
};
