'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function LandingPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    employees: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitted(true);
    setIsSubmitting(false);

    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        employees: '',
        message: '',
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Full Screen */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1D1D1F] via-[#2D2D31] to-[#1D1D1F]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '48px 48px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <h1 className="text-7xl md:text-9xl font-bold text-white mb-6 tracking-tight leading-none">
            Compass<br/>Delivery
          </h1>
          <p className="text-2xl md:text-4xl text-[#86868B] font-light mb-12 max-w-3xl mx-auto leading-relaxed">
            Elevate your workplace dining experience
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#tasting"
              className="px-10 py-5 bg-white text-[#1D1D1F] text-lg font-semibold rounded-full hover:bg-[#F5F5F7] transition-all transform hover:scale-105 shadow-2xl"
            >
              Book a Tasting Session
            </a>
            <a
              href="#how-it-works"
              className="px-10 py-5 border-2 border-white text-white text-lg font-semibold rounded-full hover:bg-white/10 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-32 px-6 bg-white" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl font-bold text-[#1D1D1F] mb-6">
              Corporate Catering,<br/>Redefined
            </h2>
            <p className="text-xl text-[#6E6E73] max-w-2xl mx-auto leading-relaxed">
              Fresh, delicious meals prepared daily by our team of experienced chefs.
              Delivered to your workplace with precision and care.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-3xl hover:bg-[#F5F5F7] transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0071E3] to-[#0077ED] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] mb-4">Chef-Crafted Menus</h3>
              <p className="text-[#6E6E73] leading-relaxed">
                Our experienced culinary team creates diverse, nutritious menus that cater to all dietary preferences and requirements.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-3xl hover:bg-[#F5F5F7] transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] mb-4">Fresh Daily Production</h3>
              <p className="text-[#6E6E73] leading-relaxed">
                Everything is prepared fresh in our state-of-the-art production kitchen. No compromises on quality.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-3xl hover:bg-[#F5F5F7] transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-[#FF9500] to-[#FF9F0A] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] mb-4">Reliable Delivery</h3>
              <p className="text-[#6E6E73] leading-relaxed">
                On-time delivery, every time. Your team can count on us to fuel their day without interruption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Production Kitchen Section */}
      <section className="py-32 px-6 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold text-[#1D1D1F] mb-6">
                Our Production Kitchen
              </h2>
              <p className="text-xl text-[#6E6E73] mb-8 leading-relaxed">
                State-of-the-art facilities where our experienced chefs work their magic.
                Every dish is prepared with precision, passion, and the finest ingredients.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0071E3] flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg text-[#1D1D1F]">HACCP certified food safety standards</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0071E3] flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg text-[#1D1D1F]">Professional chefs with 10+ years experience</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0071E3] flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg text-[#1D1D1F]">Sustainable sourcing practices</span>
                </li>
              </ul>
            </div>
            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/prod-kitchen.jpg"
                alt="Production Kitchen - Compass Delivery"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0071E3]/20 to-[#34C759]/20 group-hover:opacity-0 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Salad Bar Display Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl order-2 md:order-1 group">
              <Image
                src="/salad-bar.jpg"
                alt="Salad Bar Display - Compass Delivery"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#34C759]/20 to-[#FF9500]/20 group-hover:opacity-0 transition-opacity duration-300"></div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-5xl font-bold text-[#1D1D1F] mb-6">
                Beautiful Presentations
              </h2>
              <p className="text-xl text-[#6E6E73] mb-8 leading-relaxed">
                Your workplace restaurant becomes a destination. Our stunning salad bars and
                food displays make healthy eating an experience your employees will love.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-[#F5F5F7] rounded-2xl">
                  <div className="text-4xl font-bold text-[#0071E3] mb-2">Fresh</div>
                  <p className="text-sm text-[#6E6E73]">Daily prepared ingredients</p>
                </div>
                <div className="p-6 bg-[#F5F5F7] rounded-2xl">
                  <div className="text-4xl font-bold text-[#34C759] mb-2">Vibrant</div>
                  <p className="text-sm text-[#6E6E73]">Colorful & appetizing</p>
                </div>
                <div className="p-6 bg-[#F5F5F7] rounded-2xl">
                  <div className="text-4xl font-bold text-[#FF9500] mb-2">Diverse</div>
                  <p className="text-sm text-[#6E6E73]">Options for everyone</p>
                </div>
                <div className="p-6 bg-[#F5F5F7] rounded-2xl">
                  <div className="text-4xl font-bold text-[#FF3B30] mb-2">Healthy</div>
                  <p className="text-sm text-[#6E6E73]">Nutritious choices</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Happy Customers / Social Proof */}
      <section className="py-32 px-6 bg-gradient-to-b from-[#FAFAFA] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-[#1D1D1F] mb-6">
              Trusted by Leading Companies
            </h2>
            <p className="text-xl text-[#6E6E73] max-w-2xl mx-auto">
              Join hundreds of organizations that have transformed their workplace dining experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-[#FF9500]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#1D1D1F] mb-6 leading-relaxed">
                "The quality and variety of meals has dramatically improved employee satisfaction.
                Our team actually looks forward to lunch now!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0071E3] to-[#0077ED] flex items-center justify-center text-white font-bold">
                  AJ
                </div>
                <div>
                  <div className="font-semibold text-[#1D1D1F]">Anna Jensen</div>
                  <div className="text-sm text-[#86868B]">HR Director, Tech Corp</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-[#FF9500]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#1D1D1F] mb-6 leading-relaxed">
                "Compass Delivery has been a game-changer. Professional service,
                delicious food, and they handle everything seamlessly."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center text-white font-bold">
                  MK
                </div>
                <div>
                  <div className="font-semibold text-[#1D1D1F]">Marcus Klein</div>
                  <div className="text-sm text-[#86868B]">Operations Manager, StartupHub</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-[#FF9500]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#1D1D1F] mb-6 leading-relaxed">
                "Our employees love the variety and quality. It's become a major perk
                that helps us attract and retain talent."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF9500] to-[#FF9F0A] flex items-center justify-center text-white font-bold">
                  SL
                </div>
                <div>
                  <div className="font-semibold text-[#1D1D1F]">Sarah Liu</div>
                  <div className="text-sm text-[#86868B]">CEO, InnovateCo</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-8 pt-16 border-t border-[#E8E8ED]">
            <div className="text-center">
              <div className="text-5xl font-bold text-[#0071E3] mb-2">6</div>
              <div className="text-[#6E6E73]">Active Locations</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#34C759] mb-2">1000+</div>
              <div className="text-[#6E6E73]">Daily Meals</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#FF9500] mb-2">99%</div>
              <div className="text-[#6E6E73]">On-Time Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-[#FF3B30] mb-2">4.9★</div>
              <div className="text-[#6E6E73]">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tasting Session CTA */}
      <section className="py-32 px-6 bg-white" id="tasting">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-[#0071E3]/10 text-[#0071E3] rounded-full text-sm font-semibold mb-6">
              Start Your Journey
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-[#1D1D1F] mb-6">
              Experience It Yourself
            </h2>
            <p className="text-xl text-[#6E6E73] max-w-2xl mx-auto leading-relaxed">
              Book a complimentary tasting session and discover how Compass Delivery
              can transform your workplace dining experience.
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-[#F5F5F7] rounded-3xl p-16 text-center border border-[#E8E8ED]">
              <div className="w-24 h-24 bg-[#34C759] rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-[#1D1D1F] mb-4">Thank You!</h3>
              <p className="text-lg text-[#6E6E73]">
                We'll be in touch within 24 hours to schedule your tasting session.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 md:p-12 border border-[#E8E8ED] shadow-lg">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white text-[#1D1D1F] border border-[#D2D2D7] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white text-[#1D1D1F] border border-[#D2D2D7] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white text-[#1D1D1F] border border-[#D2D2D7] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white text-[#1D1D1F] border border-[#D2D2D7] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                    placeholder="+31 6 12345678"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Number of Employees</label>
                <select
                  value={formData.employees}
                  onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white text-[#1D1D1F] border border-[#D2D2D7] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                >
                  <option value="">Select range</option>
                  <option value="1-50">1-50</option>
                  <option value="51-100">51-100</option>
                  <option value="101-250">101-250</option>
                  <option value="251-500">251-500</option>
                  <option value="500+">500+</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">Message (Optional)</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white text-[#1D1D1F] border border-[#D2D2D7] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all resize-none"
                  placeholder="Tell us about your requirements..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-5 bg-[#0071E3] text-white text-lg font-semibold rounded-xl hover:bg-[#0077ED] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Book Your Tasting Session'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-[#1D1D1F] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-2xl font-bold mb-4">Compass Delivery</h3>
              <p className="text-[#86868B] leading-relaxed">
                Elevating workplace dining experiences across the Netherlands.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-[#86868B]">
                <li><a href="#" className="hover:text-white transition-colors">Corporate Catering</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Daily Meal Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Special Events</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Custom Menus</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-[#86868B]">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Kitchen</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sustainability</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-[#86868B]">
                <li>info@compassdelivery.nl</li>
                <li>+31 20 123 4567</li>
                <li>Amsterdam, Netherlands</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-[#86868B]">
            <p>&copy; 2026 Compass Delivery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
