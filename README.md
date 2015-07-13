# GitNames
Chrome Extension to show usernames instead of github IDs

## Installation
After cloning this repo, follow the steps below to install the extension.

1. Navigate to Chrome > Settings (Preferences) > Extensions
2. Check the "Developer Mode" check box
3. Load "unpacked" extension > select this repo's directory
4. Activate the extension!

## Behavior
Will automatically replace user ids with usernames when available. Some users haven't included their real names; you will see their id in these cases.

##### Rate Limiting
No special authentication is used (or needed, in most cases). If you see more than 60 new user names in an hour, you will likely be rate limited until the next hour. This won't break anything or cause adverse affects, except that you will see github ids instead of usernames.

##### Caching
Users who have been previously retrieved are cached to ensure only 1 request per user per 30 minutes at max. Usernames will be checked for modifications using the "If-Modified-Since" header which incurs no rate limit penalties.

