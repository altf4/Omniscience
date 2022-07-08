# Omniscience
See the future of your Magic: The Gathering tournament

Specifically, Omniscience takes the current state of a Magic: The Gathering tournament you're in (one that is using the official Companion app for tracking) and simulates thousands of possible results at random. From this, you can know what your odds are of making it into the top 8 of a tournament if you win/lose/draw. 


### Features

1. **Can I draw in?**

    If you're in the last round of an event, Omniscience will tell you the odds of making top 8 for you AND your opponent for each result of Win / Loss / Draw. It's important to include your opponent in this calculation, since you're only going to shake hands if you both are safe to draw in. IE: You may be locked at 100% for top 8 with a draw, but if your opponent is at 0% with a draw... then they're going to make you play it out!

2. **Should I drop?**

    If you're in the middle of an event, Omniscience will tell you the odds of making top 8 if you win the rest of your matches. This can let you know if you're locked out of top 8 and should drop. 

3. **Automatically pulls tournament data**

    All you need to do is log in with your M:tG Companion app credentials, and Omniscience will pull down all the details of the tournament you're in automatically. 

### FAQ

1. **What platform can I use Omniscience on?**

    Android and iOS are supported. Omniscience is written in React Native, which technically can make a local Web application, but this does not work since your browser will refuse to make cross-origin HTTP requests. Non-browser native apps do not adhere to the Same-Origin Policy, and so those work just fine.

2. **Why do I have to enter my Companion app credentials?**

    Omniscience hooks into the Companion backend to pull down tournament data. In order to get the event data, you have to be authenticated as a user in the event. That's why.

3. **Is this gonna steal my password or something?**

    No. Omniscience is Free and Open Source software. There's no ads, no spyware, no tracking. It is what it seems and no more.

4. **I just want to play around with Omniscience, how can I do that without going to a tournament?**

    You host your own dummy event using the official M:tG Companion app. Just click on the Host tab in the middle and start up an event and add some dummy players to it and record results. 

5. **How guaranteed are the percentages that Omniscience makes?**

    Omniscience works by simulating thousands of possible event outcomes at random. For even medium-sized events, this means that there's billions (if not in fact way more) of possible distinct outcomes per round. We can't simulate all of them. If Omniscience simulates 1,000 events and you make top 8 in all 1,000 simulations, it will report the percentage as 100%. But that doesn't mean there couldn't POSSIBLY be some exceedingly rare scenario lurking in the immense possibility space that we didn't happen to land on. So the numbers should be interpreted as approximations rather than mathematical certainties. In practice, it ought to be rigorous enough to base decisions on. 

    One other clarification is that Omniscience makes some reasonable assumptions about player behavior, especially around drawing. Some number of matches will inevitably result in unintentional draws. (The round goes to time with no winner) Omniscience needs to make an assumption about what this unintentional draw rate will be. If this assumption is too far off from reality, then the simulations risk not being sufficiently representative. Similarly, Omniscience assumes that players who are trivially locked for top 8 (acutally mathematicaly locked, not just stochastically likely) will choose to draw. This is typically a safe assumption, but sometimes players do strange things.

### Building from Source / Running on Expo

Omniscience is written in React Native, so building it should be as simple as `yarn` and then `yarn start`. You should then be able to pull the app up using the Expo Go app. Setting up Expo is beyond the scope of this readme, but it's pretty simple and Googleable. 

