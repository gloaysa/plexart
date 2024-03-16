import { FunctionComponent, useEffect, useState } from "react";
import { Lyrics, MediaPlayer } from "../store/media-player.type";
import { AlbumCover } from "./AlbumCover";
import { MediaControls } from "./MediaControls";
import { useMediaPlayerStore } from "../store/store";
import LyricsDisplay from "./Lyrics";
import { ExtraMediaControls } from "./ExtraMediaControls";
import { useLocation } from "wouter";

interface IMediaPlayerProps {
  plexamp: MediaPlayer;
  isSelected: boolean;
}
export const MediaDisplay: FunctionComponent<IMediaPlayerProps> = ({ plexamp, isSelected }) => {
  const { update, getLyrics, setSelectMediaPlayer } = useMediaPlayerStore((state) => state);
  useEffect(() => {}, [isSelected, plexamp, update]);
  const [lyrics, setLyrics] = useState<Lyrics | undefined>();
  const [showLyrics, setShowLyrics] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>();

  const [, setLocation] = useLocation();

  /**
   * Function that updates the media player state the first time the component is mounted.
   * If the media player is selected, it will update the state every 5 seconds.
   * Else, it will update the state every 60 seconds.
   */
  useEffect(() => {
    async function updateState() {
      await update(plexamp);
    }
    updateState();
    const interval = setInterval(updateState, isSelected ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [isSelected, update]);

  /**
   * When the media player is selected in the carousel, set the selected media player in the store.
   */
  useEffect(() => {
    if (isSelected) {
      setSelectMediaPlayer(plexamp);
    }
  }, [isSelected]);

  /**
   * If the user is not interacting with the page for 5 seconds, hide the media controls.
   */
  const handleInteraction = () => {
    clearTimeout(timeoutId);
    setIsInteracting(true);
    setTimeoutId(setTimeout(() => setIsInteracting(false), 5000));
  };

  useEffect(() => {
    // when the media player changes, get the lyrics for the new media player
    getLyrics(plexamp).then((lyr) => {
      setLyrics(lyr);
    });
  }, [getLyrics, plexamp.metadata?.playQueueItemID]);

  return (
    <div onMouseMove={handleInteraction} onTouchMove={handleInteraction}>
      {lyrics && showLyrics && <LyricsDisplay lyrics={lyrics} mediaPlayer={plexamp} />}
      <AlbumCover mediaUrl={plexamp.metadata?.thumb} />
      {isInteracting && (
        <div className="legend">
          <ExtraMediaControls showLyrics={() => setShowLyrics(!showLyrics)} showAlbums={() => setLocation("/albums")} />
          <MediaControls plexamp={plexamp} />
        </div>
      )}
    </div>
  );
};