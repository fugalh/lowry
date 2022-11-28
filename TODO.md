- refactor to a PoLA ch7 notebook focused on closely matching the graphs, as a GAK smoke test, separate notebook for fill-in-the-blank charts (dynamic bounds)
- add config options to plate
  - velocity unit
  - ceiling
  - Vs0 and Vne
- factor chart code out of notebook
- allow defining cas -> ias

# TODO 
# figure 7.10 ROC vs W
# figure 7.12 ROS vs CAS
# figure 7.13 glide angle vs CAS
# figure 7.14 max ROC vs h_rho

# Vx, Vy, Vbg, Vmd, Vh calibrated vs DA at gross and solo
# some kind of headwind/tailwind;altitude;tas graph
# a weight -> %decrease nomogram? or even better weight -> each v speed

https://www.boldmethod.com/learn-to-fly/performance/vx-vy-altitude-and-where-they-meet/ is very helpful though it's TAS not CAS.

The internet is full of the claim that "Vx IAS increases slowly with altitude, and Vy IAS decreases with altitude, until they meet at the ceiling". Some leave off the "slowly" and assume it increases perhaps by quite a bit. Very little is written about how it shouldn't change or very little, I think mostly an incomplete understanding. But there are [snippets of POHs that say the same Vx up to altitude](https://mooneyspace.com/topic/42148-vx-climb-performance-chart/#comment-727162), and [also experimentally](https://www.kitplanes.com/using-level-accelerations-to-determine-climb-performance/), so I *think* it's the case that Lowry's right that Vx CAS (therefore IAS) doesn't really change with altitude. The counter-argument is at https://jetcareers.com/forums/threads/vx-and-altitude.27113/ where they are at least aeronautical people and the reasoning looks sound, though I still think there's some confusion about CAS vs TAS. The only place I really saw anyone actually asking the question directly was here https://www.pprune.org/private-flying/534889-does-vx-ias-increase-altitude-not.html

[This article](https://www.kitplanes.com/using-level-accelerations-to-determine-climb-performance/) is an intriguing approach to finding Vx and Vy experimentally with just a constant-altitude acceleration at full throttle. I wonder what Lowry would think of this approach; I imagine it wouldn't have been practical in most aircraft in the 90s but now even if we don't have a nice data logging EFIS we can just point a cell phone or gopro camera at the dash.
