#!/usr/bin/env bash

if [ -z "$1" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

domain=$1

echo -e "\nSPF record:"
dig +short txt $domain
echo "--------------------------------"
echo -e "\nDKIM record:"
dig +short txt eb4bb63d-5563-47cb-ae72-14dd4a4fa882._domainkey.$domain
echo "--------------------------------"
echo -e "\nMX records:"
dig +short mx $domain
echo "--------------------------------"
echo -e "\nDMARC record:"
dig +short txt _dmarc.$domain
echo "--------------------------------"
