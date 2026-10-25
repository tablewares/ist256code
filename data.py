import requests
import json
import time

# leaked lmao
lastfm_api_key = "d65c50623190076d4613da5477c22da8"
discog_token = "wlepzbQlhASYRbVeaKNKpBMbkuJGVTphfgNHcwgp"

header_discog = {
    "User-Agent": "TrackDataPopulator/1.0",
    "Authorization": f"Discogs token={discog_token}"
}

def fetch_top_songs_from_lastfm(limit=100):
    url = "http://ws.audioscrobbler.com/2.0/"
    params = {
        "method": "chart.gettoptracks",
        "api_key": lastfm_api_key,
        "format": "json",
        "limit": limit
    }
    
    response = requests.get(url, params=params)
    if response.status_code != 200:
        print(f"Error fetching top songs from Last.fm: {response.status_code}")
        return []

    tracks = response.json().get("tracks", {}).get("track", [])
    
    track_list = []
    for item in tracks:
        track_list.append({
            "artist": item["artist"]["name"],
            "song": item["name"]
        })
    return track_list

def search_discogs_release(artist, track_title):
    url = "https://api.discogs.com/database/search"
    params = {
        "artist": artist,
        "track": track_title,
        "type": "release",
        "per_page": 1
    }
    response = requests.get(url, headers=header_discog, params=params)
    if response.status_code == 200:
        results = response.json().get("results", [])
        return results[0]["id"] if results else None
    return None

def fetch_discogs_details(release_id):
    url = f"https://api.discogs.com/releases/{release_id}"
    response = requests.get(url, headers=header_discog)
    if response.status_code == 200:
        return response.json()
    return None

def format_track_record(track_id, release_data, search_song, default_artist):
    matching_title = search_song
    duration = "N/A"
    
    # extract track title and duration
    for track in release_data.get("tracklist", []):
        if search_song.lower() in track.get("title", "").lower():
            matching_title = track.get("title")
            if track.get("duration"):
                duration = track.get("duration")
            break

    # Ctegory / Primary Genre
    genres = release_data.get("genres", [])
    category = genres[0] if genres else "Unknown"

    # Primary Format
    raw_formats = release_data.get("formats", [])
    format_name = "Digital"
    if raw_formats:
        fmt_type = raw_formats[0].get("name", "")
        if "Vinyl" in fmt_type:
            format_name = "Vinyl"
        elif "CD" in fmt_type:
            format_name = "CD"
        elif "File" in fmt_type or "Digital" in fmt_type:
            format_name = "Digital"
        else:
            format_name = fmt_type

    # Price
    lowest_price = release_data.get("lowest_price")
    currency = release_data.get("currency", "USD")
    price_str = f"{lowest_price:.2f}" if lowest_price else "N/A"

    artists_list = release_data.get("artists", [])
    artist_name = ", ".join([a["name"] for a in artists_list]) if artists_list else default_artist

    info_str = f"{artist_name}-{duration}"

    return {
        "productId": str(track_id),
        "description": matching_title,
        "category": category,
        "unitOfMeasure": format_name,
        "price": price_str,
        "weight": info_str
    }

def main():
    print("fetching top 100 Songs from last.fm api...")

    top_tracks = fetch_top_songs_from_lastfm(limit=100)
    
    if not top_tracks:
        print("No tracks retrieved. Exiting.")
        return

    print(f" retrieved {len(top_tracks)} top tracks.\n")

    formatted_tracks = []

    for index, item in enumerate(top_tracks):
        artist = item["artist"]
        song = item["song"]
        
        print(f"fetching: '{song}' by '{artist}'...")
        
        release_id = search_discogs_release(artist, song)
        
        if release_id:
            release_details = fetch_discogs_details(release_id)
            if release_details:
                record = format_track_record(index, release_details, song, artist)
                formatted_tracks.append(record)
            else:
                print(f"    failed to fetch release details for id {release_id}")
        else:
            print(f"    no release found on discogs for {song}")

        # rate limit
        time.sleep(1)


    with open("products2.json", "w", encoding="utf-8") as f:
        json.dump(formatted_tracks, f, indent=4)

    print(f"saved to products.json")

if __name__ == "__main__":
    main()