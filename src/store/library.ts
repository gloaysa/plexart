import { Library, LibraryItem } from "./library.interface";
import { mediaPlayerHeaders } from "./utils/getHeaders";
import { MediaPlayer } from "./media-player.type";

export const getLibrary = async (player: MediaPlayer, librariesToHide: string[]): Promise<LibraryItem[]> => {
  const response = await fetch(`${player.server.uri}/library/sections/`, {
    headers: mediaPlayerHeaders(player),
  });

  const library: Library = await response.json();
  const musicLibrary = library.MediaContainer.Directory.filter((directory) => directory.type === "artist");
  return getAlbums(player, musicLibrary, librariesToHide);
};

const getAlbums = async (
  player: MediaPlayer,
  library: Library["MediaContainer"]["Directory"],
  librariesToHide: string[],
): Promise<LibraryItem[]> => {
  const musicLibraries: LibraryItem[] = [];
  for (const libraryItem of library) {
    const response = await fetch(
      `${player.server.uri}/library/sections/${libraryItem.key}/all?type=9&excludeFields=summary&excludeElements=Media,Director,Country&sort=random&includeFields=thumbBlurHash`,
      {
        headers: mediaPlayerHeaders(player),
      },
    );
    const container = await response.json();
    const musicLibrary: LibraryItem = container.MediaContainer;
    if (!librariesToHide?.includes(musicLibrary.title1.trim().toLowerCase())) {
      const metadata = musicLibrary.Metadata.map((album) => {
        const thumbUrl = album?.thumb;
        const thumbSize = "width=1080&height=1080";
        const thumbParameters = `url=${thumbUrl}&quality=90&format=png&X-Plex-Token=${player.token}`;
        return {
          ...album,
          thumb: `${player.address}:${player.port}/photo/:/transcode?${thumbSize}&${thumbParameters}`,
        };
      });
      const mappedMusicLibrary: LibraryItem = {
        ...musicLibrary,
        Metadata: metadata,
      };
      musicLibraries.push(mappedMusicLibrary);
    }
  }
  return musicLibraries;
};
