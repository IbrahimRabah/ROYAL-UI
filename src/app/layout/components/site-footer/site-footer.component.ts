import { ChangeDetectionStrategy, Component } from '@angular/core';

import { APP_CONFIG } from '../../../core/constants/app-config';

type FooterSocialId = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'pinterest' | 'tumblr';

interface FooterSocialLink {
  id: FooterSocialId;
  icon: string | null;
  url: string;
  labelKey: string;
}

interface FooterContactItem {
  labelKey: string;
  value: string;
  href: string;
  external: boolean;
}

interface FooterNavLink {
  labelKey: string;
  path: string;
}

const { phone, quotes, email, whatsappUrl } = APP_CONFIG.contact;

@Component({
  selector: 'app-site-footer',
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteFooterComponent {
  readonly year = new Date().getFullYear();

  readonly contactItems: FooterContactItem[] = [
    { labelKey: 'footer.contact.phone', value: phone, href: `tel:+2${phone}`, external: false },
    { labelKey: 'footer.contact.whatsapp', value: phone, href: whatsappUrl, external: true },
    { labelKey: 'footer.contact.quotes', value: quotes, href: `tel:+2${quotes}`, external: false },
    { labelKey: 'footer.contact.email', value: email, href: `mailto:${email}`, external: false }
  ];

  readonly navLinks: FooterNavLink[] = [
    { labelKey: 'common.home', path: '/' },
    { labelKey: 'common.allProducts', path: '/products' },
    { labelKey: 'common.about', path: '/about' },
    { labelKey: 'common.contact', path: '/contact' }
  ];

  readonly socialLinks: FooterSocialLink[] = [
    { id: 'facebook', icon: 'pi-facebook', url: 'https://www.facebook.com/royaliron1991', labelKey: 'footer.social.facebook' },
    { id: 'instagram', icon: 'pi-instagram', url: 'https://www.instagram.com/royaliron2022/', labelKey: 'footer.social.instagram' },
    { id: 'x', icon: null, url: 'https://x.com/RoyalIron2', labelKey: 'footer.social.x' },
    { id: 'linkedin', icon: 'pi-linkedin', url: 'https://www.linkedin.com/in/royal-iron-64140a23b/', labelKey: 'footer.social.linkedin' },
    { id: 'pinterest', icon: 'pi-pinterest', url: 'https://www.pinterest.com/ahmedreda10077/_saved/', labelKey: 'footer.social.pinterest' },
    { id: 'tumblr', icon: null, url: 'https://www.tumblr.com/blog/royaliron1991', labelKey: 'footer.social.tumblr' }
  ];
}
