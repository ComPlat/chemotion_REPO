/* eslint-disable no-underscore-dangle */
const embedMatomo = () => {
  if (process.env.MATOMO_URL) {
    if (!window._mtm) {
      window._mtm = [];
    }
    const mtm = window._mtm;
    mtm.push({ 'mtm.startTime': new Date().getTime(), event: 'mtm.Start' });
    const g = document.createElement('script');
    const s = document.getElementsByTagName('script')[0];
    g.async = true;
    g.src = process.env.MATOMO_URL;
    s.parentNode.insertBefore(g, s);
  }
};

export default embedMatomo;
