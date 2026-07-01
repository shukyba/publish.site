import { getPublishPricingPlans, PUBLISH_PLATFORMS } from "../lib/publish-plans";
import { PlanCheckoutButton } from "./plan-checkout-button";

export async function PublishPricing() {
  const plans = await getPublishPricingPlans();

  return (
    <section className="pricing section-shell" id="pricing">
      <div className="section-heading">
        <span className="label">Pricing</span>
        <h2>Move from idea to scheduled posts faster.</h2>
        <p>Every plan includes a monthly pool of posts to schedule across your channels.</p>
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => {
          return (
            <article className={`pricing-card ${plan.featured ? "pricing-card-featured" : ""}`} key={plan.name}>
              <p className="plan-audience">{plan.name}</p>
              <h3>
                {plan.price}
                {plan.price !== "$0" ? <span className="plan-price-suffix">/mo</span> : null}
              </h3>
              <p className="plan-posts">
                <strong>{plan.posts.toLocaleString()}</strong> posts / month
              </p>
              <div className="plan-platforms" aria-label="Included channels">
                {PUBLISH_PLATFORMS.map((platform) => {
                  const included = plan.platforms.includes(platform);
                  return (
                    <span
                      key={platform}
                      className={`platform-badge ${included ? "is-on" : "is-off"}`}
                      aria-disabled={!included}
                    >
                      {platform}
                    </span>
                  );
                })}
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.stripePlanId != null && plan.cta ? (
                <PlanCheckoutButton planId={plan.stripePlanId} className="button button-primary button-plan">
                  {plan.cta}
                </PlanCheckoutButton>
              ) : plan.ctaNote ? (
                <span className="plan-cta-note">{plan.ctaNote}</span>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
